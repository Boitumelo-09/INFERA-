package com.application.infera.controllers;

import com.application.infera.dtos.requests.SignInRequest;
import com.application.infera.exception.InvalidUserCredentialException;
import com.application.infera.exception.UserDoesntExistByEmailException;
import com.application.infera.models.User;
import com.application.infera.services.UserService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class signInFormController {

    private final UserService userService;

    public signInFormController(UserService userService) {

        this.userService = userService;
    }

    @GetMapping("/signin")
    public String signInForm(Model model) {
        System.out.println("Sign In Form - CALLED");
        model.addAttribute("signInRequest", new SignInRequest());
        return "signin";
    }
    @PostMapping("/signin")
    public String signIn(@Valid @ModelAttribute SignInRequest signInRequest, BindingResult bd, Model model) {
        System.out.println("Sign In - CALLED");
        if (bd.hasErrors()) {
            System.out.println("Binding Result has Errors");
            return "signin";
        }
        try {
           User user = userService.signIn(signInRequest);
        } catch (UserDoesntExistByEmailException | InvalidUserCredentialException e) {
            model.addAttribute("errorCredMessage", e.getMessage());
            return "signin";
        }

        return "redirect:/dashboard";
    }
}
