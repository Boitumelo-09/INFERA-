package com.application.infera.services;

import com.application.infera.enums.MessageType;
import com.application.infera.models.FeedbackMessage;
import com.application.infera.models.User;
import com.application.infera.repositories.FeedbackMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackService {

    public static final int MAX_LENGTH = 2000;
    public static final int MAX_PER_HOUR = 5;

    private final FeedbackMessageRepository feedbackRepository;
    private final MailService mailService;

    public boolean hasReachedLimit(User user) {
        return feedbackRepository.countByUser_IdAndCreatedAtAfter(
                user.getId(), LocalDateTime.now().minusHours(1)) >= MAX_PER_HOUR;
    }

    /**
     * Emails the developer first; the record is stored only once delivery succeeded.
     * Returns false when the email could not be sent, so the caller can tell the user.
     */
    public boolean submit(User user, MessageType type, String message) {
        try {
            mailService.sendFeedbackEmail(user.getFirstName(), user.getEmail(), type, message);
        } catch (Exception e) {
            log.error("Feedback email failed for user {}", user.getId(), e);
            return false;
        }

        FeedbackMessage feedback = new FeedbackMessage();
        feedback.setUser(user);
        feedback.setType(type);
        feedback.setMessage(message);
        feedbackRepository.save(feedback);
        return true;
    }
}