package com.chatbot.conversation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDTO {

    private Long id;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<MessageDTO> messages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageDTO {
        private Long id;
        private String role;
        private String messageText;
        private String generatedSql;
        private String responseType;
        private String responseData;
        private LocalDateTime createdAt;
    }
}
