package com.application.infera.controllers;

import com.application.infera.services.NoteService;
import com.application.infera.services.UserService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/home")
public class HomePageController {
    private final UserService userService;
    private final NoteService noteService;

    public HomePageController(UserService userService, NoteService noteService) {
        this.userService = userService;
        this.noteService = noteService;
    }

    @GetMapping
    public String homePage(Model model) {
        model.addAttribute("activeUsers", userService.countAllUsers());
        model.addAttribute("pageTitle", "INFERA — Organize Knowledge. Build Understanding.");
        model.addAttribute("noteCount", noteService.countAllNotes());
        return "home";

    }
}
