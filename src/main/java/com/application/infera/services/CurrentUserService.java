package com.application.infera.services;

import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    // Handles both form login and OAuth2 login principals — always re-fetches
    // from DB by id/email rather than trusting the (possibly stale) session object
    public User resolve(Object principal) {
        if (principal instanceof CustomUserDetails userDetails) {
            return userRepository.findById(userDetails.getUser().getId()).orElse(null);
        }
        if (principal instanceof OAuth2User oAuth2User) {
            String email = oAuth2User.getAttribute("email");
            return email == null ? null : userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}