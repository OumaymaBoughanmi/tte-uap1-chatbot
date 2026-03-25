package com.chatbot.llm;

import com.chatbot.config.SchemaConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PromptBuilder {

    private final SchemaConfigRepository schemaConfigRepository;

    private static final String DEFAULT_SCHEMA = """
            Tables schema:
            orders(UniqNr,OrderNo,Description,CarModel,Leadset,ProdVersion,Quantity,Priority,Locked,LockReason,ProdProgress,GoodParts,CreationDate,TargetDate,IsKanban,PagodaPlace,VendorCode,InsertTime,UpdateTime)
            bundles(LabelId,CaoNo,Leadset,ProdVersion,Status,PagodaPlace,InvalidDtZt,Quantity,QuantityProduced,IsKanban,InsertTime,UpdateTime)
            bundles_history(BHUniqNr,LabelId,Location,Process,PersonnelNo,Name,InsertTime)
            terminal(TerminalKey,Name,TerminalType,TerminalLength,TerminalWidth,FeedingType,InsertTime)
            tool(InventoryNo,Description,Counter,MaxCounter,TotalCounter,GoodPartCounter,BadPartCounter,Locked,LockReason,Location,LastUsed,LastReset,InsertTime)
            terminal_tool(TerminalKey,InventoryNo,SealKey,VendorCode,WireType1,WireType2)
            crimpstd(TerminalKey,SealKey,WireType1,CrossSection1,WireType2,CrossSection2,InventoryNo,VendorCode,CarModel,StrippingLength,CrimpHeight,CrimpHeightTol,CrimpWidth,CrimpWidthTol,IsoCrimpHeight,IsoCrimpWidth,PullOffForce,CstUniqNr)
            tool_history(Index,InventoryNo,ActStatus0,ActStatus1,ActStatus2,PersonnelNo,Notes,InsertTime)
            machines(WorkStation,MachineName,MachineGroup,Excluded,ExcludedDate,TargetCutsPerHour,CutsCounter,PersonnelNo,CurrLeadset,CurrCaoNo,InsertTime)
            """;

    private String getSchema() {
        return schemaConfigRepository.findAll().stream()
                .findFirst()
                .map(s -> s.getSchemaText())
                .orElse(DEFAULT_SCHEMA);
    }

    public String buildSqlSystemPrompt(String language) {
    String langInstruction = "fr".equals(language)
        ? "Always respond in French when giving natural language answers."
        : "Always respond in English when giving natural language answers.";

    return langInstruction + "\n" + """
        You are a MySQL query generator for TTE International UAP1 and CAO data.
        Return ONLY the raw SQL SELECT query, nothing else. No markdown, no backticks, no comments.
        Never use DROP/DELETE/UPDATE/INSERT/ALTER/TRUNCATE.
        
        Rules:
        - Tables: orders, bundles, bundles_history, terminal, tool, terminal_tool, crimpstd, tool_history, machines
        - JOIN bundles to orders: bundles.CaoNo = orders.UniqNr
        - JOIN bundles_history to bundles: bundles_history.LabelId = bundles.LabelId
        - JOIN terminal_tool to terminal: terminal_tool.TerminalKey = terminal.TerminalKey
        - JOIN terminal_tool to tool: terminal_tool.InventoryNo = tool.InventoryNo
        - JOIN crimpstd to terminal: crimpstd.TerminalKey = terminal.TerminalKey
        - JOIN tool_history to tool: tool_history.InventoryNo = tool.InventoryNo
        - Limit 500 rows max. For tool_history always LIMIT 100.
        - Locked tools: tool.Locked = 1. Excluded machines: machines.Excluded = 1.
        - crimpstd TerminalKey: always use LIKE with single quotes around the pattern. Example: WHERE TerminalKey LIKE '%5134-01%'
        - tool_history InventoryNo: always quote. Example: WHERE InventoryNo = '12149'
        - tool_history personnel: use SELECT DISTINCT PersonnelNo
        - When user says show me all / list all / show all of them: reuse previous SQL context
        - Use GoodPartCounter and BadPartCounter from tool for good/bad parts
        - For machines table, CurrLeadset stores the current project/leadset name. Example: WHERE CurrLeadset = 'BMW-F7X-60V-6VTYCO'
        - CurrCaoNo stores the current CAO order number (integer), NOT the project name.
        
        """ + getSchema();
}

    public String buildSqlUserMessage(String userQuestion, List<Map<String, String>> history) {
        StringBuilder sb = new StringBuilder();

        if (history != null && !history.isEmpty()) {
            List<Map<String, String>> recentHistory = history.subList(
                Math.max(0, history.size() - 3), history.size()
            );
            sb.append("Previous conversation context:\n");
            for (Map<String, String> turn : recentHistory) {
                sb.append("User: ").append(turn.get("question")).append("\n");
                sb.append("SQL used: ").append(turn.get("sql")).append("\n");
                if (turn.get("answer") != null && !turn.get("answer").isEmpty()) {
                    sb.append("Answer given: ").append(turn.get("answer")).append("\n");
                }
                sb.append("\n");
            }
        }

        sb.append("Current question: ").append(userQuestion);
        return sb.toString();
    }

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