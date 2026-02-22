package com.chatbot.llm;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class PromptBuilder {

    private static final String SCHEMA = """
            Table name: label_data
            Columns:
              - label_id        BIGINT         (primary key, unique label identifier)
              - cao_no          BIGINT         (production order number)
              - leadset         VARCHAR        (leadset/product name)
              - prod_version    INT            (production version)
              - status          INT            (0 = not validated, 1 = validated)
              - pagoda_place    VARCHAR        (location/station code e.g. P/DD2-08)
              - invalid_dt_zt   DATETIME       (invalidation timestamp, nullable)
              - lsl_uniq_nr     VARCHAR        (LSL unique number, nullable)
              - quantity        INT            (planned quantity)
              - quantity_produced INT          (actual quantity produced)
              - is_kanban       INT            (1 = kanban, 0 = not kanban)
              - label_info      VARCHAR        (extra label info, nullable)
              - label_info_ext  VARCHAR        (extended label info, nullable)
              - fifo_used       INT            (FIFO flag)
              - subcontractor   VARCHAR        (subcontractor name, nullable)
              - bundles_feedback_erp_date DATETIME (ERP feedback date, nullable)
              - expiration_date DATETIME       (expiration date, nullable)
              - insert_time     DATETIME       (record creation timestamp)
              - update_time     DATETIME       (last update timestamp)
            """;

    /**
     * Builds the system prompt for SQL generation.
     */
    public String buildSqlSystemPrompt() {
        return """
                You are an expert MySQL query generator.
                You will be given a database schema and a user question.
                Your job is to generate a single valid MySQL SELECT query that answers the question.
                
                Rules:
                - Return ONLY the raw SQL query, nothing else.
                - Do NOT include markdown, backticks, explanations, or comments.
                - Do NOT use DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE.
                - Use only SELECT statements.
                - Always use the exact table name: label_data
                - For date filtering use DATE() function when needed.
                - Alias columns with meaningful names using AS.
                - Limit results to 500 rows maximum unless the user asks for all.
                
                Schema:
                """ + SCHEMA;
    }

    /**
     * Builds the user message for SQL generation including conversation history.
     */
    public String buildSqlUserMessage(String userQuestion, List<Map<String, String>> history) {
        StringBuilder sb = new StringBuilder();

        if (history != null && !history.isEmpty()) {
            sb.append("Previous conversation context:\n");
            for (Map<String, String> turn : history) {
                sb.append("User: ").append(turn.get("question")).append("\n");
                sb.append("SQL used: ").append(turn.get("sql")).append("\n\n");
            }
        }

        sb.append("Current question: ").append(userQuestion);
        return sb.toString();
    }

    /**
     * Builds the system prompt for chart/table decision.
     */
    public String buildVisualizationSystemPrompt() {
        return """
                You are a data visualization expert.
                Given a user question and a sample of the query result data, decide the best way to display it.
                
                Respond ONLY with a valid JSON object in this exact format, nothing else:
                {
                  "type": "table" | "bar" | "horizontalBar" | "line" | "pie" | "doughnut" | "scatter" | "radar" | "mixed",
                  "labelColumn": "<column name to use as label/x-axis>",
                  "valueColumns": ["<column name>", ...],
                  "title": "<short descriptive chart title>"
                }
                
                Rules:
                - Use "table" when data has many columns or is a detailed list.
                - Use "bar" for comparisons between a few categories (vertical bars).
                - Use "horizontalBar" when category names are long or there are many categories.
                - Use "line" for trends over time or sequential data.
                - Use "pie" or "doughnut" for proportions with fewer than 8 categories.
                - Use "scatter" when comparing two numeric columns against each other.
                - Use "radar" when comparing multiple metrics across a few categories (max 8).
                - Use "mixed" when you want to show both bar and line on the same chart for two related metrics.
                - labelColumn must be one of the actual column names returned.
                - valueColumns must be numeric columns from the result.
                - For "mixed" provide exactly 2 valueColumns.
                - For "scatter" provide exactly 1 valueColumn (x = labelColumn, y = valueColumn).
                """;
    }

    /**
     * Builds the user message for visualization decision.
     */
    public String buildVisualizationUserMessage(
            String userQuestion,
            List<String> columns,
            List<Map<String, Object>> sampleRows
    ) {
        return "User question: " + userQuestion + "\n\n"
                + "Result columns: " + columns + "\n\n"
                + "Sample data (first 3 rows): " + sampleRows.subList(0, Math.min(3, sampleRows.size()));
    }
}
