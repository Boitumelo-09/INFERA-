package com.application.infera.repositories;

import com.application.infera.models.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    Optional<VerificationCode> findTopByEmailOrderByCreatedAtDesc(String email);
    void deleteByEmail(String email);
    void deleteByExpiresAtBefore(LocalDateTime cutoff);
}