package com.chatbot.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final VerificationCodeStore codeStore;

    private static final Set<String> ALLOWED_ROLES = Set.of(
        "RESPONSABLE UAP", "QUALITE", "PROD", "PLANIFICATEUR", "MAINTENANCE", "USER"
    );

    // ─── Register ────────────────────────────────────────────────────────────

    public void sendVerificationCode(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already registered");
        }
        String code = generateCode();
        codeStore.save(email, code);
        emailService.sendVerificationCode(email, code);
        log.info("Verification code sent to: {}", email);
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }
        if (userRepository.existsByMatricule(request.getMatricule())) {
            throw new RuntimeException("Matricule already exists");
        }
        if (!codeStore.verify(request.getEmail(), request.getVerificationCode())) {
            throw new RuntimeException("Invalid or expired verification code");
        }

        String role = request.getRole().toUpperCase();
        if (!ALLOWED_ROLES.contains(role)) {
            role = "USER";
        }

        User user = User.builder()
                .matricule(request.getMatricule())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        userRepository.save(user);
        codeStore.remove(request.getEmail());
        log.info("Registered new user: {} with role: {}", user.getUsername(), user.getRole());

        String token = jwtService.generateToken(user);
        return buildResponse(user, token);
    }

    // ─── Login ───────────────────────────────────────────────────────────────

    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = jwtService.generateToken(user);
        log.info("User logged in: {} ({})", user.getUsername(), user.getRole());
        return buildResponse(user, token);
    }

    // ─── Forgot Password ─────────────────────────────────────────────────────

    /**
     * Step 1: Send reset code to email.
     */
    public void sendPasswordResetCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No account found with this email"));

        String code = generateCode();
        codeStore.save("reset_" + email, code);
        emailService.sendPasswordResetCode(email, user.getUsername(), code);
        log.info("Password reset code sent to: {}", email);
    }

    /**
     * Step 2: Verify reset code and set new password.
     */
    public void resetPassword(String email, String code, String newPassword) {
        if (!codeStore.verify("reset_" + email, code)) {
            throw new RuntimeException("Invalid or expired reset code");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        codeStore.remove("reset_" + email);
        log.info("Password reset successfully for: {}", email);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private AuthResponse buildResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .matricule(user.getMatricule())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    private String generateCode() {
        SecureRandom random = new SecureRandom();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }
}
