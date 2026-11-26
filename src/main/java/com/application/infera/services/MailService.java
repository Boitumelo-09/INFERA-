package com.application.infera.services;

import com.application.infera.exception.emailSendingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import com.application.infera.enums.MessageType;
import org.springframework.beans.factory.annotation.Value;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.time.Year;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${app.mail.from}")
    private String fromAddress;
    @Value("${app.mail.from-name}")
    private String fromName;
    @Value("${app.base-url}")
    private String baseUrl;
    @Value("${app.feedback.recipient}")
    private String feedbackRecipient;

    public void sendFeedbackEmail(String senderName, String senderEmail, MessageType type, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            String typeLabel = switch (type) {
                case REVIEW -> "Review";
                case ISSUE -> "Issue report";
                case SUGGESTION -> "Feature suggestion";
            };

            helper.setFrom(buildFromHeader());
            helper.setTo(feedbackRecipient);
            helper.setReplyTo(senderEmail);   // hitting Reply in your inbox goes to the user
            String stamp = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("d MMM HH:mm"));
            helper.setSubject("INCAPTUR " + typeLabel + " from " + senderEmail + " (" + stamp + ")");

            Context context = new Context();
            context.setVariable("typeLabel", typeLabel);
            context.setVariable("senderName", senderName);
            context.setVariable("senderEmail", senderEmail);
            context.setVariable("body", body);
            context.setVariable("currentYear", String.valueOf(Year.now().getValue()));

            helper.setText(templateEngine.process("mails/feedback-email", context), true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new emailSendingException("Failed to send feedback email");
        }
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
        context.setVariable("currentYear", String.valueOf(Year.now().getValue()));
        String htmlContent = templateEngine.process(
                "mails/otp-email",
                context
        );

        // Text must be set BEFORE inline resources — Spring's MimeMessageHelper
        // requires this exact order or the multipart body renders incorrectly
        helper.setText(htmlContent, true);
        helper.addInline("logo", new ClassPathResource("static/favicons/android-chrome-192x192.png"), "image/png");
        mailSender.send(message);

    } catch (Exception e) { throw new emailSendingException("Failed to send verification email");}
}

    // Call this AFTER the invitation is committed: a mail failure must not undo the invitation.
    // Never log the raw token or the link.
    public void sendInvitationEmail(String toEmail, String inviterName, String workspaceName,
                                    String roleLabel, String rawToken, int expiryDays) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper( message, MimeMessageHelper.MULTIPART_MODE_RELATED, StandardCharsets.UTF_8.name());

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
            context.setVariable("currentYear", String.valueOf(Year.now().getValue()));

            String htmlContent = templateEngine.process("mails/invitation-email", context);
            helper.setText(htmlContent, true);   // text before inline resources, same as the OTP mail
            helper.addInline("logo", new ClassPathResource("static/favicons/android-chrome-192x192.png"), "image/png");
            mailSender.send(message);
        } catch (Exception e) {
            throw new emailSendingException("Failed to send invitation email");
        }
    }
     public void sendWelcomeEmail(String name, String toEmail){
        List<String> welcomeMessages = List.of("Welcome to incaptur","Welkom by incaptur","Siyakwamukela ku-incaptur",
                 "Re a go amogela go-incaptur", "Wamkelekile kwi-incaptur","U amukeriwile eka-incaptur", "Vho tanganedzwa kha-incaptur",
                "Kena ka kgotso ho-incaptur", "O amogetswe go-incaptur");
           int randomWelcomeMessageIndex = ThreadLocalRandom.current().nextInt(welcomeMessages.size());
           String welcomeMessage = welcomeMessages.get(randomWelcomeMessageIndex);
        try{
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_RELATED, StandardCharsets.UTF_8.name());

             helper.setFrom(buildFromHeader());
             helper.setSubject("Welcome to INCAPTUR");
             helper.setTo(toEmail);

             Context context = new Context();
             if(name.equals("User")) {
                 name = "!";
                 context.setVariable("firstName", name);
             }
             else { context.setVariable("firstName", ",".concat(name.concat("!")));}
             context.setVariable("welcomeText",welcomeMessage);
             context.setVariable("currentYear", String.valueOf(Year.now().getValue()));
             String htmlContent = templateEngine.process("mails/welcome-email",context);
             helper.setText(htmlContent,true);
             helper.addInline("logo", new ClassPathResource("static/favicons/android-chrome-192x192.png"),"image/png");
             mailSender.send(message);
        } catch (Exception e) { throw new emailSendingException("Failed to send welcome email");}

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