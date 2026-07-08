package com.application.infera.controllers;

import com.application.infera.repositories.UserRepository;
import com.application.infera.services.UserService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller

public class HomePageController {
    private final UserService userService;

    public HomePageController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/home")
    public String homePage(Model model) {
        model.addAttribute("activeUsers", userService.countAllUsers());
        return "home";
    }
}
