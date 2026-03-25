package com.chatbot.auth;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class VerificationCodeStore {

    private static final int EXPIRY_MINUTES = 10;

    private record CodeEntry(String code, LocalDateTime expiresAt) {}

    private final Map<String, CodeEntry> store = new ConcurrentHashMap<>();

    public void save(String email, String code) {
        store.put(email.toLowerCase(), new CodeEntry(code, LocalDateTime.now().plusMinutes(EXPIRY_MINUTES)));
    }

    public boolean verify(String email, String code) {
        CodeEntry entry = store.get(email.toLowerCase());
        if (entry == null) return false;
        if (LocalDateTime.now().isAfter(entry.expiresAt())) {
            store.remove(email.toLowerCase());
            return false;
        }
        return entry.code().equals(code);
    }

    public void remove(String email) {
        store.remove(email.toLowerCase());
    }
}
