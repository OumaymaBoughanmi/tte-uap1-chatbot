package com.chatbot.admin;

import com.chatbot.config.SchemaConfig;
import com.chatbot.config.SchemaConfigRepository;
import com.chatbot.llm.LLMService;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import com.chatbot.config.SchemaHistory;
import com.chatbot.config.SchemaHistoryRepository;

@Slf4j
@RestController
@RequestMapping("/api/admin/schema")
@RequiredArgsConstructor
public class SchemaController {

    private final SchemaConfigRepository schemaConfigRepository;
    private final LLMService llmService;
    private final SchemaHistoryRepository schemaHistoryRepository;

    @PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @GetMapping
    public ResponseEntity<?> getSchema() {
        return schemaConfigRepository.findAll().stream()
                .findFirst()
                .map(s -> ResponseEntity.ok(Map.of(
                        "schema", s.getSchemaText(),
                        "updatedAt", s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : "",
                        "updatedBy", s.getUpdatedBy() != null ? s.getUpdatedBy() : ""
                )))
                .orElse(ResponseEntity.ok(Map.of("schema", "", "updatedAt", "", "updatedBy", "")));
    }

    @PutMapping
    public ResponseEntity<?> updateSchema(@RequestBody Map<String, String> body) {
        String schemaText = body.get("schema");
        if (schemaText == null || schemaText.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Schema cannot be empty"));
        }
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        SchemaConfig existing = schemaConfigRepository.findAll().stream().findFirst().orElse(null);
if (existing != null && existing.getSchemaText() != null) {
    SchemaHistory historyEntry = new SchemaHistory();
    historyEntry.setSchemaText(existing.getSchemaText());
    historyEntry.setUpdatedBy(existing.getUpdatedBy());
    historyEntry.setUpdatedAt(existing.getUpdatedAt());
    schemaHistoryRepository.save(historyEntry);
}
        
      SchemaConfig config = schemaConfigRepository.findAll().stream()
        .findFirst()
        .orElse(new SchemaConfig());
        config.setSchemaText(schemaText);
        config.setUpdatedBy(username);
        schemaConfigRepository.save(config);
        log.info("Schema updated by {}", username);
        return ResponseEntity.ok(Map.of("message", "Schema updated successfully"));
    }

    @GetMapping("/auto-detect")
public ResponseEntity<?> autoDetectSchema() {
    try {
        // Tables to exclude (app tables, not production data)
        List<String> excludedTables = List.of(
            "users", "conversations", "conversation_messages",
            "schema_config", "label_data"
        );

        String sql = """
            SELECT TABLE_NAME, COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'chatbot_db'
            ORDER BY TABLE_NAME, ORDINAL_POSITION
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();

        Map<String, List<String>> tableColumns = new java.util.LinkedHashMap<>();
        for (Object[] row : rows) {
            String table = row[0].toString();
            String column = row[1].toString();
            if (!excludedTables.contains(table.toLowerCase())) {
                tableColumns.computeIfAbsent(table, k -> new java.util.ArrayList<>()).add(column);
            }
        }

        StringBuilder schema = new StringBuilder("Tables schema:\n");
        tableColumns.forEach((table, columns) -> {
            schema.append(table).append("(").append(String.join(", ", columns)).append(")\n");
        });

        return ResponseEntity.ok(Map.of("schema", schema.toString()));
    } catch (Exception e) {
        return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
    }
}

    @PostMapping("/test")
    public ResponseEntity<?> testSchema(@RequestBody Map<String, String> body) {
        String question = body.get("question");
        String schema = body.get("schema");
        if (question == null || schema == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "question and schema required"));
        }
        try {
            String systemPrompt = "You are a MySQL query generator.\n"
                + "Return ONLY the raw SQL SELECT query, nothing else.\n"
                + "Never use DROP/DELETE/UPDATE/INSERT/ALTER/TRUNCATE.\n"
                + schema;
            String sql = llmService.chat(systemPrompt, "Current question: " + question);
            return ResponseEntity.ok(Map.of("sql", sql));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/history")
public ResponseEntity<?> getHistory() {
    List<SchemaHistory> history = schemaHistoryRepository.findAllOrderByUpdatedAtDesc();
    return ResponseEntity.ok(history.stream()
        .limit(10)
        .map(h -> Map.of(
            "id", h.getId(),
            "schemaText", h.getSchemaText(),
            "updatedAt", h.getUpdatedAt() != null ? h.getUpdatedAt().toString() : "",
            "updatedBy", h.getUpdatedBy() != null ? h.getUpdatedBy() : ""
        ))
        .toList());
}
}