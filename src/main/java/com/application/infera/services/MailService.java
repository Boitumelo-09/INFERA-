package com.application.infera.services;

import jakarta.mail.internet.InternetAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.io.UnsupportedEncodingException;

@Service
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;
    @Value("${app.mail.from-name}")
    private String fromName;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(buildFromHeader());
        message.setTo(toEmail);
        message.setSubject("Your INCAPTUR verification code");
        message.setText("Your verification code is: INC-" + code + "\n\nThis code expires in 10 minutes.");
        mailSender.send(message);
    }

    private String buildFromHeader() {
        try {
            return new InternetAddress(fromAddress, fromName).toString();
        } catch (UnsupportedEncodingException e) {
            return fromAddress;
        }
    }
}