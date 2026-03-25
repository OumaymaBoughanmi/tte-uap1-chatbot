package com.chatbot.conversation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;

    public ConversationDTO createConversation(String title, Long userId) {
        Conversation conversation = Conversation.builder()
                .title(title)
                .userId(userId)
                .build();
        conversation = conversationRepository.save(conversation);
        return toDTOWithoutMessages(conversation);
    }

    public ConversationDTO saveMessage(Long conversationId, Long userId, ConversationDTO.MessageDTO messageDTO) {
        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        ConversationMessage message = ConversationMessage.builder()
                .conversation(conversation)
                .role(messageDTO.getRole())
                .messageText(messageDTO.getMessageText())
                .generatedSql(messageDTO.getGeneratedSql())
                .responseType(messageDTO.getResponseType())
                .responseData(messageDTO.getResponseData())
                .build();

        messageRepository.save(message);
        conversationRepository.save(conversation);
        return toDTOWithoutMessages(conversation);
    }

    public List<ConversationDTO> getAllConversations(Long userId) {
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(this::toDTOWithoutMessages)
                .collect(Collectors.toList());
    }

    public ConversationDTO getConversation(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        return toDTO(conversation);
    }

    public void deleteConversation(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        conversationRepository.delete(conversation);
    }

    public ConversationDTO updateTitle(Long conversationId, Long userId, String newTitle) {
        Conversation conversation = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        conversation.setTitle(newTitle);
        conversationRepository.save(conversation);
        return toDTOWithoutMessages(conversation);
    }

    public List<ConversationDTO> searchConversations(Long userId, String query) {
    // Search by title
    List<Conversation> byTitle = conversationRepository
            .findByUserIdAndTitleContainingIgnoreCase(userId, query);

    // Search by message content
    List<ConversationMessage> byContent = messageRepository
            .findByConversation_UserIdAndMessageTextContainingIgnoreCase(userId, query);

    // Merge results — avoid duplicates
    List<Long> titleIds = byTitle.stream().map(Conversation::getId).collect(Collectors.toList());

    List<Conversation> byContentConversations = byContent.stream()
            .map(ConversationMessage::getConversation)
            .filter(c -> !titleIds.contains(c.getId()))
            .distinct()
            .collect(Collectors.toList());

    List<Conversation> all = new java.util.ArrayList<>(byTitle);
    all.addAll(byContentConversations);

    return all.stream()
            .map(this::toDTOWithoutMessages)
            .collect(Collectors.toList());
}

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private ConversationDTO toDTO(Conversation conversation) {
        List<ConversationDTO.MessageDTO> messages = List.of();

        if (conversation.getMessages() != null) {
            messages = conversation.getMessages().stream()
                    .map(m -> ConversationDTO.MessageDTO.builder()
                            .id(m.getId())
                            .role(m.getRole())
                            .messageText(m.getMessageText())
                            .generatedSql(m.getGeneratedSql())
                            .responseType(m.getResponseType())
                            .responseData(m.getResponseData())
                            .createdAt(m.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());
        }

        return ConversationDTO.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .messages(messages)
                .build();
    }

    private ConversationDTO toDTOWithoutMessages(Conversation conversation) {
        return ConversationDTO.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
    }
}