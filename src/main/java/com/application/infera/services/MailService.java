package com.application.infera.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

@Service
public class MailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${app.mail.from}")
    private String fromAddress;
    @Value("${app.mail.from-name}")
    private String fromName;
    @Value("${app.base-url}")
    private String baseUrl;

    public MailService(JavaMailSender mailSender, SpringTemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }


public void sendOtpEmail(String toEmail, String code) {

    try {
        MimeMessage message = mailSender.createMimeMessage();

        MimeMessageHelper helper = new MimeMessageHelper(
                message,
                MimeMessageHelper.MULTIPART_MODE_RELATED,
                StandardCharsets.UTF_8.name()
        );

        helper.setFrom(buildFromHeader());
        helper.setTo(toEmail);
        helper.setSubject("Your INCAPTUR verification code");

        // Give the HTML template its dynamic values
        Context context = new Context();
        context.setVariable("code", code);

        String htmlContent = templateEngine.process(
                "mails/otp-email",
                context
        );

        // Text must be set BEFORE inline resources — Spring's MimeMessageHelper
        // requires this exact order or the multipart body renders incorrectly
        helper.setText(htmlContent, true);
        helper.addInline("logo", new ClassPathResource("static/favicons/android-chrome-192x192.png"), "image/png");
        mailSender.send(message);

    } catch (Exception e) {
        throw new RuntimeException(
                "Failed to send verification email",
                e
        );
    }
}

    // Call this AFTER the invitation is committed: a mail failure must not undo the invitation.
    // Never log the raw token or the link.
    public void sendInvitationEmail(String toEmail, String inviterName, String workspaceName,
                                    String roleLabel, String rawToken, int expiryDays) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message, MimeMessageHelper.MULTIPART_MODE_RELATED, StandardCharsets.UTF_8.name());

            helper.setFrom(buildFromHeader());
            helper.setTo(toEmail);
            helper.setSubject(oneLine(inviterName) + " invited you to " + oneLine(workspaceName) + " on INCAPTUR");

            String base = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
            Context context = new Context();
            context.setVariable("inviterName", inviterName);
            context.setVariable("workspaceName", workspaceName);
            context.setVariable("roleLabel", roleLabel);
            context.setVariable("expiryDays", expiryDays);
            context.setVariable("link", base + "/invitations/" + rawToken);

            String htmlContent = templateEngine.process("mails/invitation-email", context);
            helper.setText(htmlContent, true);   // text before inline resources, same as the OTP mail
            helper.addInline("logo", new ClassPathResource("static/favicons/android-chrome-192x192.png"), "image/png");
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send invitation email", e);
        }
    }

    // Header values must be one line (stops header injection through a workspace or user name)
    private static String oneLine(String s) {
        return s == null ? "" : s.replaceAll("[\\r\\n]+", " ").trim();
    }

    private String buildFromHeader() {
        try {
            return new InternetAddress(fromAddress, fromName).toString();
        } catch (UnsupportedEncodingException e) {
            return fromAddress;
        }
    }
}