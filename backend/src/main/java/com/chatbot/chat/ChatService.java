package com.chatbot.chat;

import com.chatbot.data.DynamicQueryService;
import com.chatbot.llm.LLMService;
import com.chatbot.llm.PromptBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final LLMService llmService;
    private final PromptBuilder promptBuilder;
    private final DynamicQueryService dynamicQueryService;
    private final ObjectMapper objectMapper;

    private boolean isMessageOnlyResult(List<Map<String, Object>> results, List<String> columns) {
        if (results.size() == 1 && columns.size() == 1) {
            String col = columns.get(0).toLowerCase();
            return col.equals("message") || col.equals("error") || col.equals("info");
        }
        return false;
    }

   private String detectRepeatRequest(String question, List<Map<String, String>> history) {
    String q = question.toLowerCase().trim();
    boolean isRepeatRequest = q.equals("show me") || q.equals("show all") || 
        q.equals("show me all") || q.equals("list all") || q.equals("show all of them") ||
        q.equals("show me all of them") || q.equals("all of them") || q.equals("all") ||
        q.equals("list them") || q.equals("show them");
    
    if (isRepeatRequest && history != null && !history.isEmpty()) {
        String lastSql = history.get(history.size() - 1).get("sql");
        if (lastSql != null && !lastSql.isEmpty()) {
            // If previous query was a COUNT, convert to SELECT *
            String upperSql = lastSql.toUpperCase();
            if (upperSql.contains("COUNT(")) {
                // Extract table name from FROM clause
                String modifiedSql = lastSql.replaceAll("(?i)SELECT\\s+COUNT\\([^)]*\\)\\s*(AS\\s+\\w+)?", "SELECT *");
                modifiedSql = modifiedSql.replaceAll("(?i)\\s+LIMIT\\s+\\d+", "") + " LIMIT 100";
                return modifiedSql;
            }
            // Remove existing LIMIT and add larger one
            return lastSql.replaceAll("(?i)\\s+LIMIT\\s+\\d+", "") + " LIMIT 500";
        }
    }
    return null;


}

    public ChatResponse processQuestion(ChatRequest request) {
    String userQuestion = request.getMessage();
    List<Map<String, String>> history = request.getHistory();
    String language = request.getLanguage() != null ? request.getLanguage() : "en";
    
    // Check for conversational messages first
    String conversationalReply = detectConversationalMessage(userQuestion);
    if (conversationalReply != null) {
        return ChatResponse.builder()
                .type("text")
                .naturalAnswer(conversationalReply)
                .totalRows(0)
                .build();
    }

    // Check if user wants to see more from previous query
    String repeatQuery = detectRepeatRequest(userQuestion, history);
if (repeatQuery != null) {
    List<Map<String, Object>> results = dynamicQueryService.executeQuery(repeatQuery);
    List<String> columns = dynamicQueryService.extractColumns(results);
    if (!results.isEmpty()) {
        String naturalAnswer = generateNaturalAnswer(userQuestion, results, columns);
        return ChatResponse.builder()
                .generatedSql(repeatQuery)
                .type("table")
                .columns(columns)
                .data(results)
                .totalRows(results.size())
                .naturalAnswer(naturalAnswer)
                .build();
    }
}

        // Step 1: Generate SQL
        try {
            // Step 1: Generate SQL
            String sqlSystemPrompt = promptBuilder.buildSqlSystemPrompt(language);
            String sqlUserMessage = promptBuilder.buildSqlUserMessage(userQuestion, history);
            String generatedSql = llmService.chat(sqlSystemPrompt, sqlUserMessage);

            log.info("Generated SQL: {}", generatedSql);

            // Step 2: Execute SQL
            List<Map<String, Object>> results = dynamicQueryService.executeQuery(generatedSql);
            List<String> columns = dynamicQueryService.extractColumns(results);

            if (results.isEmpty() || isMessageOnlyResult(results, columns)) {
    return ChatResponse.builder()
            .generatedSql(generatedSql)
            .type("error")
            .totalRows(0)
            .error("Sorry, I couldn't find any data matching your question. Please try rephrasing it or ask something related to the production data.")
            .build();
}

            // Single value result — answer directly as text
            if (results.size() == 1 && columns.size() == 1) {
                String col = columns.get(0);
                Object val = results.get(0).get(col);
                String naturalAnswer = generateNaturalAnswer(userQuestion, results, columns);
                return ChatResponse.builder()
                        .generatedSql(generatedSql)
                        .type("text")
                        .totalRows(1)
                        .naturalAnswer(naturalAnswer != null ? naturalAnswer : col.replace("_", " ") + ": " + val)
                        .build();
            }

// Step 3: Generate natural language answer
            String naturalAnswer = generateNaturalAnswer(userQuestion, results, columns);
            log.info("Natural answer: {}", naturalAnswer);

            // Step 4: Check if user explicitly asked for a table or chart
            String forcedType = detectChartTypeFromQuestion(userQuestion);
            boolean wantsTable = detectTableRequest(userQuestion);

            // No explicit visualization request → just return natural language answer
            if (forcedType == null && !wantsTable) {
                return ChatResponse.builder()
                        .generatedSql(generatedSql)
                        .type("text")
                        .totalRows(results.size())
                        .naturalAnswer(naturalAnswer)
                        .build();
            }

            // User asked for a chart
            if (forcedType != null) {
                ChatResponse.ChartConfig chartConfig = buildChartConfigFromData(columns, results, userQuestion, forcedType);
                return ChatResponse.builder()
                        .generatedSql(generatedSql)
                        .type(forcedType)
                        .columns(columns)
                        .data(results)
                        .chartConfig(chartConfig)
                        .totalRows(results.size())
                        .naturalAnswer(naturalAnswer)
                        .build();
            }

            // User asked for a table
            return ChatResponse.builder()
                    .generatedSql(generatedSql)
                    .type("table")
                    .columns(columns)
                    .data(results)
                    .totalRows(results.size())
                    .naturalAnswer(naturalAnswer)
                    .build();

        } catch (IllegalArgumentException e) {
            log.error("Query validation error: {}", e.getMessage());
            return ChatResponse.builder()
                    .error("Invalid query generated: " + e.getMessage())
                    .type("error")
                    .build();

        } catch (Exception e) {
            log.error("Unexpected error processing chat request: {}", e.getMessage(), e);
            return ChatResponse.builder()
                    .error("An error occurred: " + e.getMessage())
                    .type("error")
                    .build();
        }
    }

    private boolean detectTableRequest(String question) {
    String q = question.toLowerCase();
    return q.contains("table") || q.contains("list") || q.contains("show me") ||
           q.contains("display") || q.contains("all ") || q.contains("tableau") ||
           q.contains("export") || q.contains("give me all") || q.contains("show all");
}

    private String generateNaturalAnswer(String userQuestion, List<Map<String, Object>> results, List<String> columns) {
        try {
            String systemPrompt = "You are a production data assistant for TTE International UAP1. " +
                "Given a user question and query results, write a short, direct, natural language answer (1-3 sentences). " +
                "Answer the question directly using the data. Do NOT mention SQL. Do NOT say 'based on the query'. " +
                "Be concise and factual. If there are multiple distinct values in the results, list them all — do NOT say they are all the same unless they truly are.";

            String userPrompt = "Question: " + userQuestion + "\n" +
                "Total results: " + results.size() + "\n" +
                "Columns: " + columns + "\n" +
                "First 3 rows: " + results.subList(0, Math.min(3, results.size()));

            return llmService.chat(systemPrompt, userPrompt);
        } catch (Exception e) {
            log.warn("Failed to generate natural answer: {}", e.getMessage());
            return null;
        }
    }

    private String detectChartTypeFromQuestion(String question) {
        String q = question.toLowerCase();

        if (q.contains("scatter") || q.contains("scatter plot") || q.contains("scatter chart")) return "scatter";
        if (q.contains("radar") || q.contains("spider") || q.contains("web chart")) return "radar";
        if (q.contains("mixed") || q.contains("bar and line") || q.contains("line and bar") || q.contains("combo chart")) return "mixed";
        if (q.contains("horizontal bar") || q.contains("horizontal chart") || q.contains("hbar")) return "horizontalBar";
        if (q.contains("doughnut") || q.contains("donut")) return "doughnut";
        if (q.contains("pie chart") || q.contains("pie graph")) return "pie";
        if (q.contains("line chart") || q.contains("line graph") || q.contains("trend")) return "line";
        if (q.contains("bar chart") || q.contains("bar graph") || q.contains("histogram")) return "bar";

        return null;
    }

    private ChatResponse.ChartConfig buildChartConfigFromData(
            List<String> columns, List<Map<String, Object>> results,
            String userQuestion, String chartType) {

        if (columns.isEmpty()) return null;

        String labelColumn = columns.get(0);
        List<String> valueColumns;

        List<String> numericColumns = columns.stream()
                .filter(col -> !col.equals(labelColumn))
                .filter(col -> {
                    Object val = results.get(0).get(col);
                    return val instanceof Number;
                })
                .toList();

        if (numericColumns.isEmpty()) {
            valueColumns = columns.subList(1, Math.min(columns.size(), 3));
        } else {
            if ("mixed".equals(chartType)) {
                valueColumns = numericColumns.subList(0, Math.min(2, numericColumns.size()));
            } else if ("scatter".equals(chartType)) {
                valueColumns = numericColumns.subList(0, Math.min(1, numericColumns.size()));
            } else {
                valueColumns = numericColumns;
            }
        }

        return ChatResponse.ChartConfig.builder()
                .title(buildTitleFromQuestion(userQuestion))
                .labelColumn(labelColumn)
                .valueColumns(valueColumns)
                .build();
    }

    private String buildTitleFromQuestion(String question) {
        if (question.length() <= 50) return question;
        return question.substring(0, 47) + "...";
    }

    private String detectConversationalMessage(String question) {
    String q = question.toLowerCase().trim();
    
    // Only match if the ENTIRE message is conversational (short and no data keywords)
   boolean hasDataKeywords = q.contains("tool") || q.contains("terminal") || 
    q.contains("order") || q.contains("bundle") || q.contains("machine") ||
    q.contains("crimp") || q.contains("wire") || q.contains("operator") ||
    q.contains("parts") || q.contains("produced") || q.contains("locked") ||
    q.contains("project") || q.contains("leadset") || q.contains("cross section") ||
    q.contains("stripping") || q.contains("pull") || q.contains("inventory") ||
    q.contains("personnel") || q.contains("force") || q.contains("width") ||
    q.contains("height") || q.contains("status") || q.contains("history") ||
    q.contains("worked") || q.contains("who") || q.contains("which") ||
    q.contains("what") || q.contains("how many") || q.contains("when") ||
    q.contains("where") || q.contains("show") || q.contains("list") ||
    q.contains("give") || q.contains("find") || q.contains("get");
    if (hasDataKeywords) return null;
    
    if (q.matches("^(thank you|thanks|thx|merci|شكرا)[.!]?$")) {
        return "You're welcome! 😊 If you have any other questions about the production data, feel free to ask.";
    }
    if (q.contains("hello") || q.contains("hi") || q.contains("hey") || q.contains("bonjour") || q.contains("salam")) {
        return "Hello! 👋 How can I help you with the production data today?";
    }
    if (q.matches("^(good|great|perfect|awesome|excellent|nice|cool|wow)[.!]?$")) {
        return "Glad I could help! 😊 Let me know if you need anything else.";
    }
    if (q.matches("^(bye|goodbye|see you|au revoir)[.!]?$")) {
        return "Goodbye! 👋 Come back anytime you need help with the data.";
    }
    if (q.matches("^(ok|okay|alright|got it|understood|i see)[.!]?$")) {
        return "Great! Let me know if you have any other questions. 😊";
    }
    return null;
}
}