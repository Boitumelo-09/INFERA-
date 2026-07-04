package com.application.infera.security;


import com.application.infera.enums.Role;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.Authentication;
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
    public void onAuthenticationSuccess(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        System.out.println("Authentication successful");
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        assert oauthUser != null;
        String email = oauthUser.getAttribute("email");
        String firstName = oauthUser.getAttribute("given_name");
        String lastName = oauthUser.getAttribute("family_name");

        Optional<User> existingUser = userRepository.findByEmail(email);
        if(existingUser.isEmpty()){

            User user = new User();

            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setPassword(UUID.randomUUID().toString());
            user.setEmail(email);
            user.setRole(Role.USER);
            user.setEnabled(true);

            userRepository.save(user);
        }

        response.sendRedirect("/dashboard");
    }
}