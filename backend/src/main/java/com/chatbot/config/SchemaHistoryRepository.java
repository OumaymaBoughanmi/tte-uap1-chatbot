package com.chatbot.config;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SchemaHistoryRepository extends JpaRepository<SchemaHistory, Long> {
    @Query("SELECT s FROM SchemaHistory s ORDER BY s.updatedAt DESC")
    List<SchemaHistory> findAllOrderByUpdatedAtDesc();
}

