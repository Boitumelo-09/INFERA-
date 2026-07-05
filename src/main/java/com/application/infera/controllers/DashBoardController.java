package com.application.infera.controllers;

import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.CustomUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashBoardController {

    private final UserRepository userRepository;

    public DashBoardController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard")
    public String dashboard(@AuthenticationPrincipal Object principal, Model model) {

        User user = resolveUser(principal);

        if (user == null) {
            return "redirect:/signin";
        }

        model.addAttribute("user", user);
        model.addAttribute("sessionID", "user.getId()");
        System.out.println("Session ID: " + user.getId());
        return "dashboard";
    }

    // Handles both form login and OAuth2 login principals
    private User resolveUser(Object principal) {
        if (principal instanceof CustomUserDetails userDetails) {
            // Form login — principal is your CustomUserDetails
            return userDetails.getUser();
        }

        if (principal instanceof OAuth2User oAuth2User) {
            // OAuth2 login — look up user by email from the OAuth2 attributes
            String email = oAuth2User.getAttribute("email");
            if (email == null) return null;
            return userRepository.findByEmail(email).orElse(null);
        }

        return null;
    }
}