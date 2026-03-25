package com.chatbot.admin;

import com.chatbot.auth.User;
import com.chatbot.auth.UserRepository;
import com.chatbot.conversation.ConversationRepository;
import com.chatbot.conversation.ConversationMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository conversationMessageRepository;
    private final PasswordEncoder passwordEncoder;

    // ─── Get all users ────────────────────────────────────────────────────────
    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<UserDTO> users = userRepository.findAll().stream()
                .map(u -> new UserDTO(u.getId(), u.getUsername(), u.getEmail(), u.getMatricule(), u.getRole(), u.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(users);
    }

    // ─── Change user role ─────────────────────────────────────────────────────
    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newRole = body.get("role");
        if (!newRole.equals("USER") && !newRole.equals("ADMIN")) {
            return ResponseEntity.badRequest().body("Invalid role. Must be USER or ADMIN.");
        }
        return userRepository.findById(id).map(user -> {
            user.setRole(newRole);
            userRepository.save(user);
            log.info("Changed role of user {} to {}", user.getUsername(), newRole);
            return ResponseEntity.ok(Map.of("message", "Role updated successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─── Delete user ──────────────────────────────────────────────────────────
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            // Delete messages first, then conversations, then user
            List<Long> convIds = conversationRepository.findByUserIdOrderByUpdatedAtDesc(id)
                    .stream().map(c -> c.getId()).toList();
            convIds.forEach(conversationMessageRepository::deleteByConversationId);
            conversationRepository.deleteByUserId(id);
            userRepository.deleteById(id);
            log.info("Deleted user {}", user.getUsername());
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/conversations")
public ResponseEntity<?> getAllConversations() {
    return ResponseEntity.ok(
        conversationRepository.findAll().stream()
            .map(c -> {
                String username = userRepository.findById(c.getUserId())
                    .map(User::getUsername)
                    .orElse("Unknown");
                return Map.of(
                    "id", c.getId(),
                    "title", c.getTitle(),
                    "username", username,
                    "createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : "",
                    "updatedAt", c.getUpdatedAt() != null ? c.getUpdatedAt().toString() : ""
                );
            })
            .toList()
    );
}
}
