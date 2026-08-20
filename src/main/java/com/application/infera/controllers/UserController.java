package com.application.infera.controllers;

import com.application.infera.models.User;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final CurrentUserService currentUserService;
    private final UserService userService;

    @PostMapping("/mark-welcome-seen")
    public ResponseEntity<Void> markWelcomeSeen(@AuthenticationPrincipal Object principal) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(401).build();
        userService.markWelcomeSeen(user.getId());
        System.out.println("User " + user.getId() + " marked welcome seen IN CONTROLLER");
        return ResponseEntity.ok().build();
    }
}