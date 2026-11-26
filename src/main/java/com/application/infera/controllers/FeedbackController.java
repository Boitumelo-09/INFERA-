package com.application.infera.controllers;

import com.application.infera.enums.MessageType;
import com.application.infera.models.User;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final CurrentUserService currentUserService;
    private final FeedbackService feedbackService;

    public record FeedbackRequest(MessageType type, String message) {}

    @PostMapping
    public ResponseEntity<Map<String, String>> submit(@AuthenticationPrincipal Object principal,
                                                      @RequestBody FeedbackRequest request) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(401).build();

        String message = request.message() == null ? "" : request.message().trim();
        if (request.type() == null || message.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Choose a type and write a message."));
        }
        if (message.length() > FeedbackService.MAX_LENGTH) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Message is too long (max " + FeedbackService.MAX_LENGTH + " characters)."));
        }
        if (feedbackService.hasReachedLimit(user)) {
            return ResponseEntity.status(429).body(Map.of("error",
                    "You've sent several messages recently. Please try again in a little while."));
        }

        boolean sent = feedbackService.submit(user, request.type(), message);
        if (!sent) {
            return ResponseEntity.status(502).body(Map.of("error",
                    "We couldn't deliver your message right now. Your text is still here, so please try again in a moment."));
        }
        return ResponseEntity.ok(Map.of("status", "sent"));
    }
}