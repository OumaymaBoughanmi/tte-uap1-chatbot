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

    public ChatResponse processQuestion(ChatRequest request) {
        String userQuestion = request.getMessage();
        List<Map<String, String>> history = request.getHistory();

        try {
            // Step 1: Generate SQL
            String sqlSystemPrompt = promptBuilder.buildSqlSystemPrompt();
            String sqlUserMessage = promptBuilder.buildSqlUserMessage(userQuestion, history);
            String generatedSql = llmService.chat(sqlSystemPrompt, sqlUserMessage);

            log.info("Generated SQL: {}", generatedSql);

            // Step 2: Execute SQL
            List<Map<String, Object>> results = dynamicQueryService.executeQuery(generatedSql);
            List<String> columns = dynamicQueryService.extractColumns(results);

            if (results.isEmpty()) {
                return ChatResponse.builder()
                        .generatedSql(generatedSql)
                        .type("table")
                        .columns(columns)
                        .data(results)
                        .totalRows(0)
                        .build();
            }

            // Step 3: Detect chart type from user question first
            String forcedType = detectChartTypeFromQuestion(userQuestion);

            String vizType = "table";
            ChatResponse.ChartConfig chartConfig = null;

            if (forcedType != null) {
                // User explicitly asked for a specific chart type
                log.info("Forced chart type from question: {}", forcedType);
                vizType = forcedType;
                chartConfig = buildChartConfigFromData(columns, results, userQuestion, vizType);

            } else {
                // Step 4: Ask LLM to decide visualization
                String vizSystemPrompt = promptBuilder.buildVisualizationSystemPrompt();
                String vizUserMessage = promptBuilder.buildVisualizationUserMessage(userQuestion, columns, results);
                String vizDecisionJson = llmService.chat(vizSystemPrompt, vizUserMessage);

                log.info("Visualization decision: {}", vizDecisionJson);

                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> vizMap = objectMapper.readValue(vizDecisionJson, Map.class);

                    vizType = (String) vizMap.getOrDefault("type", "table");

                    if (!"table".equals(vizType)) {
                        String title = (String) vizMap.getOrDefault("title", "Chart");
                        String labelColumn = (String) vizMap.getOrDefault("labelColumn", columns.get(0));

                        @SuppressWarnings("unchecked")
                        List<String> valueColumns = (List<String>) vizMap.getOrDefault("valueColumns", List.of());

                        chartConfig = ChatResponse.ChartConfig.builder()
                                .title(title)
                                .labelColumn(labelColumn)
                                .valueColumns(valueColumns)
                                .build();
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse visualization decision, defaulting to table: {}", e.getMessage());
                    vizType = "table";
                }
            }

            // Step 5: Build response
            return ChatResponse.builder()
                    .generatedSql(generatedSql)
                    .type(vizType)
                    .columns(columns)
                    .data(results)
                    .chartConfig(chartConfig)
                    .totalRows(results.size())
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

    /**
     * Detects chart type explicitly mentioned in the user question.
     * Returns null if no specific chart type is mentioned.
     */
    private String detectChartTypeFromQuestion(String question) {
        String q = question.toLowerCase();

        if (q.contains("scatter") || q.contains("scatter plot") || q.contains("scatter chart")) {
            return "scatter";
        }
        if (q.contains("radar") || q.contains("spider") || q.contains("web chart")) {
            return "radar";
        }
        if (q.contains("mixed") || q.contains("bar and line") || q.contains("line and bar") || q.contains("combo chart")) {
            return "mixed";
        }
        if (q.contains("horizontal bar") || q.contains("horizontal chart") || q.contains("hbar")) {
            return "horizontalBar";
        }
        if (q.contains("doughnut") || q.contains("donut")) {
            return "doughnut";
        }
        if (q.contains("pie chart") || q.contains("pie graph")) {
            return "pie";
        }
        if (q.contains("line chart") || q.contains("line graph") || q.contains("trend")) {
            return "line";
        }
        if (q.contains("bar chart") || q.contains("bar graph") || q.contains("histogram")) {
            return "bar";
        }

        return null;
    }

    /**
     * Builds a ChartConfig automatically from the query result columns.
     * First column = label, remaining numeric columns = values.
     */
    private ChatResponse.ChartConfig buildChartConfigFromData(
            List<String> columns,
            List<Map<String, Object>> results,
            String userQuestion,
            String chartType
    ) {
        if (columns.isEmpty()) return null;

        String labelColumn = columns.get(0);
        List<String> valueColumns;

        // Find numeric columns for values
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

    /**
     * Builds a short chart title from the user question.
     */
    private String buildTitleFromQuestion(String question) {
        if (question.length() <= 50) return question;
        return question.substring(0, 47) + "...";
    }
}