package com.application.infera.services;

import com.application.infera.enums.Role;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthFlowService {

    private final UserRepository userRepository;

    /** Finds the user by (already-normalized) email or creates one; refreshes the avatar if the provider gave one. */
    public User provisionUser(String email, String firstName, String lastName, String avatarUrl) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isEmpty()) {
            User user = new User();
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setEmail(email);
            user.setRole(Role.USER);
            user.setEnabled(true);
            user.setAvatarUrl(avatarUrl);
            return userRepository.save(user);
        }
        User user = existing.get();
        if (avatarUrl != null) {
            user.setAvatarUrl(avatarUrl);
            return userRepository.save(user);
        }
        return user;
    }

    // Back to a pending invitation page if one was stored before sign-in, else the dashboard.
    // Only a path that exactly matches /invitations/<43-char token> is ever honoured (no open redirect).
    public String postLoginTarget(HttpServletRequest request) {
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
}