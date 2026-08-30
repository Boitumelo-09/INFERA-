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

    public MailService(JavaMailSender mailSender, SpringTemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

//    public void sendOtpEmail(String toEmail, String code) {
//        SimpleMailMessage message = new SimpleMailMessage();
//        message.setFrom(buildFromHeader());
//        message.setTo(toEmail);
//        message.setSubject("Your INCAPTUR verification code");
//        message.setText("Your verification code is: INC-" + code + "\n\nThis code expires in 10 minutes.");
//        mailSender.send(message);
//    }
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
        helper.addInline("logo", new ClassPathResource("static/app_resources/incapturLogo.png"), "image/png");
        mailSender.send(message);

    } catch (Exception e) {
        throw new RuntimeException(
                "Failed to send verification email",
                e
        );
    }
}

    private String buildFromHeader() {
        try {
            return new InternetAddress(fromAddress, fromName).toString();
        } catch (UnsupportedEncodingException e) {
            return fromAddress;
        }
    }
}