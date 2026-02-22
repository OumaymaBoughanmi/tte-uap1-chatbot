package com.chatbot.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class LLMService {

    @Value("${groq.api.url}")
    private String groqApiUrl;

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.model}")
    private String groqModel;

    @Value("${groq.api.max-tokens}")
    private int maxTokens;

    @Value("${groq.api.temperature}")
    private double temperature;

    private final RestTemplate restTemplate;

    public LLMService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Sends a chat completion request to Groq API.
     *
     * @param systemPrompt the system instruction
     * @param userMessage  the user message
     * @return the raw text response from the LLM
     */
    public String chat(String systemPrompt, String userMessage) {
        log.debug("Calling Groq API — model: {}", groqModel);
        log.debug("User message: {}", userMessage);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        Map<String, Object> requestBody = Map.of(
            "model", groqModel,
            "max_tokens", maxTokens,
            "temperature", temperature,
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userMessage)
            )
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(groqApiUrl, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<?> choices = (List<?>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<?, ?> firstChoice = (Map<?, ?>) choices.get(0);
                    Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");
                    String content = (String) message.get("content");
                    log.debug("Groq response: {}", content);
                    return content.trim();
                }
            }
            throw new RuntimeException("Empty or invalid response from Groq API");

        } catch (Exception e) {
            log.error("Groq API call failed: {}", e.getMessage(), e);
            throw new RuntimeException("LLM service unavailable: " + e.getMessage(), e);
        }
    }
}
