package com.application.infera.controllers;

import com.application.infera.dtos.requests.SignUpRequest;
import com.application.infera.exception.UserExistsByEmailException;
import com.application.infera.services.UserService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
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
    public String signUp(@Valid @ModelAttribute SignUpRequest signUpRequest, BindingResult bindingResult, Model model) {
        System.out.println("Controller Reached");
        if (bindingResult.hasErrors()) {
            System.out.println("Binding Result has Errors");
            return "signup";
        }
        try {
            userService.registerUserToDatabase(signUpRequest);
            return "redirect:/signin";
        } catch (UserExistsByEmailException e)
            {
             model.addAttribute("errorMessage", e.getMessage());
             return "signup";
            }
    }
}
