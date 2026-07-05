package com.application.infera.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class signInFormController {
    @GetMapping("/signin")
    public String signInForm() {
        return "signin";
    }
}
