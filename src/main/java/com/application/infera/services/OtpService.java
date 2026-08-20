package com.application.infera.services;

import com.application.infera.models.VerificationCode;
import com.application.infera.repositories.VerificationCodeRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpService {

    private static final int CODE_LENGTH = 6;
    private static final Duration EXPIRY = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;

    private final VerificationCodeRepository codeRepository;
    private final SecureRandom random = new SecureRandom();

    public OtpService(VerificationCodeRepository codeRepository) {
        this.codeRepository = codeRepository;
    }

    public enum RequestStatus { SENT, COOLDOWN }
    public enum VerifyResult { SUCCESS, EXPIRED, INVALID, LOCKED, NOT_FOUND }

    public record RequestOutcome(RequestStatus status, String code) {}

    public RequestOutcome requestCode(String email) {
        Optional<VerificationCode> last = codeRepository.findTopByEmailOrderByCreatedAtDesc(email);
        if (last.isPresent() && Duration.between(last.get().getCreatedAt(), LocalDateTime.now()).compareTo(RESEND_COOLDOWN) < 0) {
            return new RequestOutcome(RequestStatus.COOLDOWN, null);
        }

        String code = generateCode();
        VerificationCode vc = new VerificationCode();
        vc.setEmail(email);
        vc.setCode(code);
        vc.setExpiresAt(LocalDateTime.now().plus(EXPIRY));
        codeRepository.save(vc);

        return new RequestOutcome(RequestStatus.SENT, code);
    }

    public String generateCode() {
        int num = random.nextInt(1_000_000);
        return String.format("%06d", num);
    }

    public VerifyResult verifyCode(String email, String submittedCode) {
        Optional<VerificationCode> latest = codeRepository.findTopByEmailOrderByCreatedAtDesc(email);
        if (latest.isEmpty() || latest.get().isConsumed()) return VerifyResult.NOT_FOUND;

        VerificationCode vc = latest.get();

        if (vc.getAttempts() >= MAX_ATTEMPTS) return VerifyResult.LOCKED;
        if (LocalDateTime.now().isAfter(vc.getExpiresAt())) return VerifyResult.EXPIRED;

        if (!vc.getCode().equals(submittedCode)) {
            vc.setAttempts(vc.getAttempts() + 1);
            codeRepository.save(vc);
            return VerifyResult.INVALID;
        }

        vc.setConsumed(true);
        codeRepository.save(vc);
        return VerifyResult.SUCCESS;
    }
}