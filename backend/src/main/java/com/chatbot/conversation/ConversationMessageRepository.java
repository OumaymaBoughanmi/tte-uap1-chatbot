package com.chatbot.conversation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, Long> {

    List<ConversationMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
    List<ConversationMessage> findByConversation_UserIdAndMessageTextContainingIgnoreCase(Long userId, String text);

void deleteByConversationId(Long conversationId);

}
