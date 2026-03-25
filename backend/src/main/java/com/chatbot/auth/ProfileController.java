package com.chatbot.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final Set<String> ALLOWED_ROLES = Set.of(
        "RESPONSABLE", "QUALITE", "PROD", "LOGISTIQUE", "MAINTENANCE", "USER"
    );

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ─── Get profile ──────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getProfile() {
        User user = getCurrentUser();
        return ResponseEntity.ok(Map.of(
            "id", user.getId(),
            "username", user.getUsername(),
            "email", user.getEmail(),
            "matricule", user.getMatricule(),
            "role", user.getRole(),
            "profilePicture", user.getProfilePicture() != null ? user.getProfilePicture() : ""
        ));
    }

    // ─── Update username ──────────────────────────────────────────────────────
    @PutMapping("/username")
    public ResponseEntity<?> updateUsername(@RequestBody Map<String, String> body) {
        String newUsername = body.get("username");
        if (newUsername == null || newUsername.trim().length() < 3) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username must be at least 3 characters"));
        }
        if (userRepository.existsByUsername(newUsername)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));
        }
        User user = getCurrentUser();
        user.setUsername(newUsername);
        userRepository.save(user);
        log.info("Username updated to: {}", newUsername);
        return ResponseEntity.ok(Map.of("message", "Username updated successfully", "username", newUsername));
    }

    // ─── Update password ──────────────────────────────────────────────────────
    @PutMapping("/password")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> body) {
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        }

        User user = getCurrentUser();
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password updated for: {}", user.getUsername());
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    // ─── Update role ──────────────────────────────────────────────────────────
    @PutMapping("/role")
    public ResponseEntity<?> updateRole(@RequestBody Map<String, String> body) {
        String newRole = body.get("role").toUpperCase();
        if (!ALLOWED_ROLES.contains(newRole)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
        }
        User user = getCurrentUser();
        user.setRole(newRole);
        userRepository.save(user);
        log.info("Role updated to: {} for user: {}", newRole, user.getUsername());
        return ResponseEntity.ok(Map.of("message", "Role updated successfully", "role", newRole));
    }

    // ─── Upload profile picture ───────────────────────────────────────────────
    @PutMapping("/picture")
    public ResponseEntity<?> updateProfilePicture(@RequestBody Map<String, String> body) {
        String base64Image = body.get("image");
        if (base64Image == null || base64Image.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No image provided"));
        }
        User user = getCurrentUser();
        user.setProfilePicture(base64Image);
        userRepository.save(user);
        log.info("Profile picture updated for: {}", user.getUsername());
        return ResponseEntity.ok(Map.of("message", "Profile picture updated successfully", "image", base64Image));
    }

    // ─── Get dashboard layout ─────────────────────────────────────────────────
@GetMapping("/dashboard-layout")
public ResponseEntity<?> getDashboardLayout() {
    User user = getCurrentUser();
    return ResponseEntity.ok(Map.of("layout", user.getDashboardLayout() != null ? user.getDashboardLayout() : ""));
}

// ─── Save dashboard layout ────────────────────────────────────────────────
@PutMapping("/dashboard-layout")
public ResponseEntity<?> saveDashboardLayout(@RequestBody Map<String, String> body) {
    String layout = body.get("layout");
    User user = getCurrentUser();
    user.setDashboardLayout(layout);
    userRepository.save(user);
    return ResponseEntity.ok(Map.of("message", "Layout saved successfully"));
}
}
