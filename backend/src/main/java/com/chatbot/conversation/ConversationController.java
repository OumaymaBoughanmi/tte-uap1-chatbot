package com.chatbot.conversation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    /**
     * GET /api/conversations
     * Returns all conversations ordered by most recent first.
     */
    @GetMapping
    public ResponseEntity<List<ConversationDTO>> getAllConversations() {
        return ResponseEntity.ok(conversationService.getAllConversations());
    }

    /**
     * GET /api/conversations/{id}
     * Returns a single conversation with all its messages.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ConversationDTO> getConversation(@PathVariable Long id) {
        return ResponseEntity.ok(conversationService.getConversation(id));
    }

    /**
     * POST /api/conversations
     * Creates a new conversation.
     * Body: { "title": "My conversation" }
     */
    @PostMapping
    public ResponseEntity<ConversationDTO> createConversation(@RequestBody Map<String, String> body) {
        String title = body.getOrDefault("title", "New Conversation");
        return ResponseEntity.ok(conversationService.createConversation(title));
    }

    /**
     * POST /api/conversations/{id}/messages
     * Saves a message to a conversation.
     */
    @PostMapping("/{id}/messages")
    public ResponseEntity<ConversationDTO.MessageDTO> saveMessage(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        ConversationDTO.MessageDTO message = conversationService.saveMessage(
                id,
                (String) body.get("role"),
                (String) body.get("messageText"),
                (String) body.get("generatedSql"),
                (String) body.get("responseType"),
                body.get("responseData")
        );
        return ResponseEntity.ok(message);
    }

    /**
     * PUT /api/conversations/{id}/title
     * Updates the title of a conversation.
     */
    @PutMapping("/{id}/title")
    public ResponseEntity<ConversationDTO> updateTitle(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(conversationService.updateTitle(id, body.get("title")));
    }

    /**
     * DELETE /api/conversations/{id}
     * Deletes a conversation and all its messages.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long id) {
        conversationService.deleteConversation(id);
        return ResponseEntity.noContent().build();
    }
}
