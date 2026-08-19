package com.application.infera.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller

public class privacyController {
    @GetMapping("/privacy")
    public String privacy() {
        return "privacy";
    }
    @GetMapping("/terms")
    public String terms() {
        return "terms";
    }
}
