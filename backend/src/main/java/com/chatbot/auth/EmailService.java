package com.chatbot.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    /**
     * Sends a registration verification code.
     */
    public void sendVerificationCode(String toEmail, String code) {
        String subject = "TTE International - UAP1 Chatbot Registration Code";
        String html = buildEmailHtml(
            "Registration Verification",
            "Your registration verification code is:",
            code,
            "This code expires in 10 minutes."
        );
        sendEmail(toEmail, subject, html);
        log.info("Registration code sent to: {}", toEmail);
    }

    /**
     * Sends a password reset code.
     */
    public void sendPasswordResetCode(String toEmail, String username, String code) {
        String subject = "TTE International - UAP1 Chatbot Password Reset";
        String html = buildEmailHtml(
            "Password Reset",
            "Hello <strong>" + username + "</strong>, your password reset code is:",
            code,
            "This code expires in 10 minutes. If you did not request a password reset, please ignore this email."
        );
        sendEmail(toEmail, subject, html);
        log.info("Password reset code sent to: {}", toEmail);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void sendEmail(String toEmail, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send email");
        }
    }

    private String buildEmailHtml(String title, String message, String code, String footer) {
        return """
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #0056a2;">TTE International</h2>
                    <p style="color: #666; font-size: 14px;">UAP1 Data Chatbot — %s</p>
                </div>
                <div style="background: #f5f5f5; border-radius: 12px; padding: 30px; text-align: center;">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">%s</p>
                    <div style="background: #0056a2; color: white; font-size: 36px; font-weight: bold;
                                letter-spacing: 10px; padding: 20px 40px; border-radius: 8px;
                                display: inline-block;">
                        %s
                    </div>
                    <p style="color: #999; font-size: 13px; margin-top: 20px;">%s</p>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                    TTE International &mdash; Onetech company
                </p>
            </div>
            """.formatted(title, message, code, footer);
    }
}
