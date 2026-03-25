package com.chatbot.conversation;

import com.chatbot.auth.User;
import com.chatbot.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;
    private final UserRepository userRepository;

    // ─── Get current user ID from JWT ────────────────────────────────────────

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    // ─── Endpoints ───────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<ConversationDTO>> getAllConversations() {
        return ResponseEntity.ok(conversationService.getAllConversations(getCurrentUserId()));
    }

    @PostMapping
    public ResponseEntity<ConversationDTO> createConversation(@RequestBody Map<String, String> body) {
        String title = body.getOrDefault("title", "New Conversation");
        return ResponseEntity.ok(conversationService.createConversation(title, getCurrentUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationDTO> getConversation(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(conversationService.getConversation(id, getCurrentUserId()));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long id) {
        try {
            conversationService.deleteConversation(id, getCurrentUserId());
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

@PostMapping("/{id}/messages")
public ResponseEntity<?> saveMessage(
        @PathVariable Long id,
        @RequestBody ConversationDTO.MessageDTO messageDTO) {
    try {
        Long currentUserId = getCurrentUserId();
        log.info("SaveMessage: conversationId={}, currentUserId={}", id, currentUserId);
        return ResponseEntity.ok(conversationService.saveMessage(id, currentUserId, messageDTO));
    } catch (RuntimeException e) {
        Long currentUserId = getCurrentUserId();
        log.error("SaveMessage FAILED: conversationId={}, currentUserId={}, error={}", 
            id, currentUserId, e.getMessage());
        return ResponseEntity.status(404).body("Conversation not found");
    }
}

    @PutMapping("/{id}/title")
    public ResponseEntity<ConversationDTO> updateTitle(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String newTitle = body.getOrDefault("title", "Conversation");
            return ResponseEntity.ok(conversationService.updateTitle(id, getCurrentUserId(), newTitle));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<ConversationDTO>> searchConversations(@RequestParam String query) {
    return ResponseEntity.ok(conversationService.searchConversations(getCurrentUserId(), query));
}


}
