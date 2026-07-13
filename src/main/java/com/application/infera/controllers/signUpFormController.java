package com.application.infera.controllers;

import com.application.infera.dtos.requests.SignUpRequest;
import com.application.infera.exception.PasswordsDontMatchException;
import com.application.infera.exception.UserEmailErrorException;
import com.application.infera.exception.UserNameOrLastNameCantBeNullException;
import com.application.infera.services.UserService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/signup")
public class signUpFormController {
    private final UserService userService;

    public signUpFormController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public String signUpForm(Model model) {
       model.addAttribute("pageTitle","Create your account — INFERA");
       model.addAttribute("signUpRequest", new SignUpRequest());
        return "signup";
    }
    @PostMapping
    public String signUp(@Valid @ModelAttribute SignUpRequest signUpRequest, BindingResult bindingResult, Model model) {
        System.out.println("Somebody tries to sign up");
        if (bindingResult.hasErrors()) {
            System.out.println("Binding Result has Errors");
            return "signup";
        }
        try {
            userService.registerUserToDatabase(signUpRequest);
            return "redirect:/signin";
        } catch (UserEmailErrorException e)
            {
                System.out.println("Somebody Encountered An Error: " + e.getMessage());
             model.addAttribute("errorMessage", e.getMessage());
             return "signup";
            }
         catch (PasswordsDontMatchException e){
            System.out.println("Somebody Encountered An Error: " + e.getMessage());
            model.addAttribute("confirmPassError", e.getMessage());
             return "signup";
         }
        catch (UserNameOrLastNameCantBeNullException e) {
            System.out.println("Somebody Encountered An Error: " + e.getMessage());
            model.addAttribute("errorNamesMessage", e.getMessage());
            return "signup";
        }
    }
}
