package com.chatbot.conversation;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    /**
     * Creates a new conversation with the given title.
     */
    @Transactional
    public ConversationDTO createConversation(String title) {
        Conversation conversation = Conversation.builder()
                .title(title)
                .build();
        conversation = conversationRepository.save(conversation);
        log.info("Created conversation id={} title={}", conversation.getId(), title);
        return toDTO(conversation);
    }

    /**
     * Saves a message to an existing conversation.
     */
    @Transactional
    public ConversationDTO.MessageDTO saveMessage(
            Long conversationId,
            String role,
            String messageText,
            String generatedSql,
            String responseType,
            Object responseData
    ) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + conversationId));

        String responseDataJson = null;
        if (responseData != null) {
            try {
                responseDataJson = objectMapper.writeValueAsString(responseData);
            } catch (Exception e) {
                log.warn("Failed to serialize response data: {}", e.getMessage());
            }
        }

        ConversationMessage message = ConversationMessage.builder()
                .conversation(conversation)
                .role(role)
                .messageText(messageText)
                .generatedSql(generatedSql)
                .responseType(responseType)
                .responseData(responseDataJson)
                .build();

        message = messageRepository.save(message);

        // Update conversation updatedAt
        conversationRepository.save(conversation);

        return toMessageDTO(message);
    }

    /**
     * Returns all conversations ordered by most recent first.
     */
    @Transactional(readOnly = true)
    public List<ConversationDTO> getAllConversations() {
        return conversationRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(this::toDTOWithoutMessages)
                .collect(Collectors.toList());
    }

    /**
     * Returns a single conversation with all its messages.
     */
    @Transactional(readOnly = true)
    public ConversationDTO getConversation(Long id) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + id));

        List<ConversationMessage> messages = messageRepository
                .findByConversationIdOrderByCreatedAtAsc(id);

        ConversationDTO dto = toDTOWithoutMessages(conversation);
        dto.setMessages(messages.stream().map(this::toMessageDTO).collect(Collectors.toList()));
        return dto;
    }

    /**
     * Deletes a conversation and all its messages.
     */
    @Transactional
    public void deleteConversation(Long id) {
        conversationRepository.deleteById(id);
        log.info("Deleted conversation id={}", id);
    }

    /**
     * Updates the title of a conversation.
     */
    @Transactional
    public ConversationDTO updateTitle(Long id, String newTitle) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + id));
        conversation.setTitle(newTitle);
        return toDTOWithoutMessages(conversationRepository.save(conversation));
    }

    // ─── Mappers ──────────────────────────────────────────────────────────────

    private ConversationDTO toDTO(Conversation c) {
        return ConversationDTO.builder()
                .id(c.getId())
                .title(c.getTitle())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private ConversationDTO toDTOWithoutMessages(Conversation c) {
        return ConversationDTO.builder()
                .id(c.getId())
                .title(c.getTitle())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private ConversationDTO.MessageDTO toMessageDTO(ConversationMessage m) {
        return ConversationDTO.MessageDTO.builder()
                .id(m.getId())
                .role(m.getRole())
                .messageText(m.getMessageText())
                .generatedSql(m.getGeneratedSql())
                .responseType(m.getResponseType())
                .responseData(m.getResponseData())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
