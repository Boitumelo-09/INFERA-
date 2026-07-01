package com.application.infera.controllers;

import com.application.infera.dtos.requests.SignUpRequest;
import com.application.infera.services.UserService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class signUpFormController {
    private final UserService userService;

    public signUpFormController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/signup")
    public String signUpForm(Model model) {
       model.addAttribute("signUpRequest", new SignUpRequest());
        return "signup";
    }
    @PostMapping("/signup")
    public String signUp(@Valid @ModelAttribute SignUpRequest signUpRequest) {
        userService.registerUserToDatabase(signUpRequest);
        return "redirect:/signin";
    }
}
