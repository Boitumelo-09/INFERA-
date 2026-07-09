package com.application.infera.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/signin")
public class signInFormController {
    @GetMapping
    public String signInForm(Model model) {
        model.addAttribute("pageTitle","Sign in — INFERA");
        return "signin";
    }
}
