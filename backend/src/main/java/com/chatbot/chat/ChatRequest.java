package com.chatbot.chat;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ChatRequest {

    @NotBlank(message = "Message cannot be blank")
    private String message;

    /**
     * Multi-turn history sent from the frontend.
     * Each entry contains: { "question": "...", "sql": "..." }
     */
    private List<Map<String, String>> history;
}
