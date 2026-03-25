package com.chatbot.admin;

import java.time.LocalDateTime;

public record UserDTO(
    Long id,
    String username,
    String email,
    String matricule,
    String role,
    LocalDateTime createdAt
) {}
