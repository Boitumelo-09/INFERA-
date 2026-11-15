package com.application.infera.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class GoogleIdTokenService {

    public record GoogleIdentity(String email, String firstName, String lastName, String picture, String nonce) {}

    private static final String JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";

    private final NimbusJwtDecoder decoder;

    public GoogleIdTokenService(@Value("${spring.security.oauth2.client.registration.google.client-id}") String clientId) {
        this.decoder = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();

        OAuth2TokenValidator<Jwt> issuer = jwt -> {
            String iss = jwt.getClaimAsString("iss");
            return ("https://accounts.google.com".equals(iss) || "accounts.google.com".equals(iss))
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Bad issuer", null));
        };
        OAuth2TokenValidator<Jwt> audience = jwt ->
                jwt.getAudience() != null && jwt.getAudience().contains(clientId)
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Bad audience", null));

        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(), issuer, audience));
    }

    /** Empty on ANY problem: bad signature, wrong aud/iss, expired, nonce mismatch, unverified email. */
    public Optional<GoogleIdentity> verify(String idToken, java.util.List<String> allowedNonces) {
        if (allowedNonces == null || allowedNonces.isEmpty()) {
            System.out.println("ONE-TAP REJECTED: no nonce in session");
            return Optional.empty();
        }
        if (idToken == null || idToken.isBlank()) return Optional.empty();
        try {
            Jwt jwt = decoder.decode(idToken);

            String tokenNonce = jwt.getClaimAsString("nonce");
            if (tokenNonce == null) {
                System.out.println("ONE-TAP REJECTED: token has no nonce claim");
                return Optional.empty();
            }
            boolean known;
            synchronized (allowedNonces) { known = allowedNonces.contains(tokenNonce); }
            if (!known) {
                System.out.println("ONE-TAP REJECTED: token nonce was not issued to this session (session holds "
                        + allowedNonces.size() + ")");
                return Optional.empty();
            }
            if (!Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) return Optional.empty();

            String email = jwt.getClaimAsString("email");
            if (email == null || email.isBlank()) return Optional.empty();

            String given = jwt.getClaimAsString("given_name");
            String family = jwt.getClaimAsString("family_name");
            return Optional.of(new GoogleIdentity(
                    email.trim().toLowerCase(),
                    (given == null || given.isBlank()) ? "User" : given,
                    family == null ? "" : family,
                    jwt.getClaimAsString("picture"),
                    tokenNonce));
        } catch (JwtException e) {
            System.out.println("ONE-TAP REJECTED: " + e.getMessage());
            return Optional.empty();
        }
    }
}