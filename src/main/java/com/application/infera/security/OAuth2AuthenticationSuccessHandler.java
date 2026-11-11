package com.application.infera.security;

import com.application.infera.enums.Role;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import com.application.infera.services.InvitationTokens;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;

    public OAuth2AuthenticationSuccessHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
        System.out.println("OAuth2AuthenticationSuccessHandler initialized");
    }

    @Override
    public void onAuthenticationSuccess(@NonNull HttpServletRequest request,
                                        @NonNull HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        System.out.println("Someone Is Authenticated");

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        // Detect provider: "google" or "github"
        String provider = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();

        assert oauthUser != null;
        String email     = OAuthEmailResolver.resolve(oauthUser);
        String firstName = resolveFirstName(oauthUser, provider);
        String lastName  = resolveLastName(oauthUser, provider);

        // Cannot save a user without an email — redirect with error
        if (email == null || email.isBlank()) {
            response.sendRedirect("/login?error=email_unavailable");
            return;
        }
        email = email.trim().toLowerCase();

        String avatarUrl = resolveAvatarUrl(oauthUser, provider);

        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isEmpty()) {
            User user = new User();
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setEmail(email);
            user.setRole(Role.USER);
            user.setEnabled(true);
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);
        } else if (avatarUrl != null) {
            User user = existingUser.get();
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);
        }

        response.sendRedirect(resolvePostLoginTarget(request));
    }

    // ── ATTRIBUTE RESOLVERS ──────────────────────────────────────────
    // Back to a pending invitation page if one was stored before sign-in, else the dashboard.
    // Only a path that exactly matches /invitations/<43-char token> is ever honoured (no open redirect).
    private String resolvePostLoginTarget(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            Object stored = session.getAttribute(InvitationTokens.RETURN_PATH_SESSION_KEY);
            session.removeAttribute(InvitationTokens.RETURN_PATH_SESSION_KEY);
            if (stored instanceof String path && InvitationTokens.RETURN_PATH.matcher(path).matches()) {
                return path;
            }
        }
        return "/dashboard";
    }

    private String resolveAvatarUrl(OAuth2User oauthUser, String provider) {
        if ("google".equals(provider)) return oauthUser.getAttribute("picture");
        if ("github".equals(provider)) return oauthUser.getAttribute("avatar_url");
        // Microsoft's default OIDC userinfo response has no photo claim —
        // Graph photo requires a separate authenticated call we're not making here.
        return null;
    }
    private String resolveEmail(OAuth2User oauthUser, String provider) {
        // Google and GitHub expose "email" directly, but GitHub users
        // can hide it — in that case we fall back to login@github.oauth
        String email = oauthUser.getAttribute("email");
        if (email != null && !email.isBlank()) return email;

        if ("github".equals(provider)) {
            String login = oauthUser.getAttribute("login"); // always present on GitHub
            if (login != null) return login + "@github.oauth";
        }

        if ("microsoft".equals(provider)) {
            // Personal MSA accounts sometimes populate "email", work/school accounts
            // often only populate "preferred_username" (usually the UPN/email)
            String preferredUsername = oauthUser.getAttribute("preferred_username");
            if (preferredUsername != null && !preferredUsername.isBlank()) return preferredUsername;
        }

        return null;
    }

    private String resolveFirstName(OAuth2User oauthUser, String provider) {
        if ("google".equals(provider) || "microsoft".equals(provider)) {
            // Both Google and Microsoft's OIDC claims return given_name directly
            String givenName = oauthUser.getAttribute("given_name");
            if (givenName != null && !givenName.isBlank()) return givenName;
        }

        if ("github".equals(provider)) {
            // GitHub returns a single "name" field e.g. "Sipho Ndlovu"
            String fullName = oauthUser.getAttribute("name");
            if (fullName != null && !fullName.isBlank()) {
                int space = fullName.indexOf(' ');
                return space > 0 ? fullName.substring(0, space).trim() : fullName.trim();
            }
            // No display name set — use the GitHub username
            return oauthUser.getAttribute("login");
        }

        if ("microsoft".equals(provider)) {
            // given_name missing — fall back to splitting "name"
            String fullName = oauthUser.getAttribute("name");
            if (fullName != null && !fullName.isBlank()) {
                int space = fullName.indexOf(' ');
                return space > 0 ? fullName.substring(0, space).trim() : fullName.trim();
            }
        }

        return "User"; // generic fallback
    }
    private String resolveLastName(OAuth2User oauthUser, String provider) {
        if ("google".equals(provider) || "microsoft".equals(provider)) {
            // Both Google and Microsoft's OIDC claims return family_name directly
            String familyName = oauthUser.getAttribute("family_name");
            if (familyName != null && !familyName.isBlank()) return familyName;
        }

        if ("github".equals(provider) || "microsoft".equals(provider)) {
            String fullName = oauthUser.getAttribute("name");
            if (fullName != null && fullName.contains(" ")) {
                return fullName.substring(fullName.indexOf(' ')).trim();
            }
        }

        return "";
    }
}