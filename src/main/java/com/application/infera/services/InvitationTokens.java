package com.application.infera.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

public final class InvitationTokens {

    private static final SecureRandom RANDOM = new SecureRandom();

    // 32 bytes, URL-safe base64, no padding = exactly 43 characters
    private static final java.util.regex.Pattern TOKEN_FORMAT = java.util.regex.Pattern.compile("^[A-Za-z0-9_-]{43}$");

    // The only post-login redirect we will ever honour: the invitation page itself
    public static final java.util.regex.Pattern RETURN_PATH =
            java.util.regex.Pattern.compile("^/invitations/[A-Za-z0-9_-]{43}$");
    public static final String RETURN_PATH_SESSION_KEY = "INVITE_RETURN_PATH";

    public static boolean isWellFormed(String token) {
        return token != null && TOKEN_FORMAT.matcher(token).matches();
    }

    private InvitationTokens() {}

    // 32 random bytes = 256 bits, URL-safe, goes in the email link only
    public static String generate() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // SHA-256 hex (64 chars): what the database stores. A fast hash is fine for a 256-bit random token.
    public static String hash(String rawToken) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}