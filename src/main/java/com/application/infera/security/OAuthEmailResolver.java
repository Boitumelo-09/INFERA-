package com.application.infera.security;

import org.springframework.security.oauth2.core.user.OAuth2User;

public final class OAuthEmailResolver {

    private OAuthEmailResolver() {}

    // Order: "email" (Google/GitHub public/Microsoft MSA) -> "preferred_username" (Microsoft work/school)
    // -> GitHub hidden-email fallback login@github.oauth. Returns null if nothing usable.
    public static String resolve(OAuth2User user) {
        String email = user.getAttribute("email");
        if (email != null && !email.isBlank()) return email;

        String preferred = user.getAttribute("preferred_username");
        if (preferred != null && !preferred.isBlank()) return preferred;

        String login = user.getAttribute("login");          // only GitHub sends "login"
        if (login != null && !login.isBlank()) return login + "@github.oauth";

        return null;
    }
}