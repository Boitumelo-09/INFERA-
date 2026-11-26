package com.application.infera.repositories;

import com.application.infera.models.FeedbackMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface FeedbackMessageRepository extends JpaRepository<FeedbackMessage, Long> {

    long countByUser_IdAndCreatedAtAfter(Long userId, LocalDateTime since);
}