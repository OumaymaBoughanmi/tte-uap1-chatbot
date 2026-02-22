package com.chatbot.conversation;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(name = "role", nullable = false)
    private String role;

    @Column(name = "message_text", columnDefinition = "TEXT")
    private String messageText;

    @Column(name = "generated_sql", columnDefinition = "TEXT")
    private String generatedSql;

    @Column(name = "response_type")
    private String responseType;

    @Column(name = "response_data", columnDefinition = "LONGTEXT")
    private String responseData;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
