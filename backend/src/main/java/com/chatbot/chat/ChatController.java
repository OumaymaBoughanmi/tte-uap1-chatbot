package com.chatbot.chat;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * POST /api/chat
     * Accepts a user question and conversation history,
     * returns structured data response with visualization metadata.
     */
    @PostMapping
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        log.info("Received chat request: {}", request.getMessage());
        ChatResponse response = chatService.processQuestion(request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/chat/health
     * Simple health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Chatbot backend is running");
    }
}
