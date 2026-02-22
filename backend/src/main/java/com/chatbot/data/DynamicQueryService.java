package com.chatbot.data;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Slf4j
@Service
public class DynamicQueryService {

    @PersistenceContext
    private EntityManager entityManager;

    // Whole-word regex patterns for dangerous SQL keywords
    private static final String[] BLOCKED_KEYWORDS = {
        "DROP", "DELETE", "UPDATE", "INSERT", "ALTER",
        "TRUNCATE", "CREATE", "EXEC", "EXECUTE"
    };

    /**
     * Executes a raw SQL query and returns a list of rows,
     * each row represented as a LinkedHashMap preserving column order.
     */
    public List<Map<String, Object>> executeQuery(String sql) {
        log.debug("Executing dynamic SQL: {}", sql);

        validateQuery(sql);

        var nativeQuery = entityManager.createNativeQuery(sql);

        var hibernateQuery = nativeQuery.unwrap(org.hibernate.query.NativeQuery.class);
        hibernateQuery.setTupleTransformer((tuple, aliases) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 0; i < aliases.length; i++) {
                row.put(aliases[i], tuple[i]);
            }
            return row;
        });

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> typedResults = hibernateQuery.getResultList();

        log.debug("Query returned {} rows", typedResults.size());
        return typedResults;
    }

    /**
     * Extracts column names from the first row of results.
     */
    public List<String> extractColumns(List<Map<String, Object>> results) {
        if (results == null || results.isEmpty()) {
            return new ArrayList<>();
        }
        return new ArrayList<>(results.get(0).keySet());
    }

    /**
     * Safety guard — only SELECT statements are allowed.
     * Uses whole-word matching to avoid false positives like
     * "insert_time" triggering the INSERT block.
     */
    private void validateQuery(String sql) {
        String trimmed = sql.trim().toUpperCase();

        if (!trimmed.startsWith("SELECT")) {
            throw new IllegalArgumentException(
                "Only SELECT queries are permitted. Received: " + sql
            );
        }

        for (String keyword : BLOCKED_KEYWORDS) {
            // Match keyword as a whole word only — not as part of column names
            Pattern pattern = Pattern.compile("\\b" + keyword + "\\b");
            if (pattern.matcher(trimmed).find()) {
                throw new IllegalArgumentException(
                    "Blocked keyword detected in query: " + keyword
                );
            }
        }
    }
}