package com.application.infera.controllers;

import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;

@Controller
@RequestMapping("/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final WorkspaceService workspaceService;
    private final NoteService noteService;
    private final ResourceService resourceService;
    private final CurrentUserService currentUserService;
    private final ProfileService profileService;

    @GetMapping
    public String profilePage(@AuthenticationPrincipal Object principal, Model model) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";

        model.addAttribute("user", user);
        model.addAttribute("pageTitle", "Profile — INCAPTUR");
        model.addAttribute("workspaceCount", workspaceService.countWorkspacesForUser(user));
        model.addAttribute("noteCount", noteService.countNotesForUser(user));
        model.addAttribute("resourceCount", resourceService.countResourcesForUser(user));
        return "profile";
    }

    @PostMapping("/update")

    public String updateProfile(@AuthenticationPrincipal Object principal,
                                @RequestParam("firstName") String firstName,
                                @RequestParam("lastName") String lastName,
                                @RequestParam(value = "lifeRole", required = false) String lifeRole,
                                @RequestParam(value = "location", required = false) String location,
                                @RequestParam(value = "bio", required = false) String bio,
                                RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";

        profileService.updateProfile(user, firstName, lastName, lifeRole, location, bio);
        redirectAttributes.addFlashAttribute("toast", "Profile updated");
        return "redirect:/profile";
    }

    @PostMapping("/avatar")
    @ResponseBody
    public Map<String, Object> uploadAvatar(@AuthenticationPrincipal Object principal,
                                            @RequestParam("file") MultipartFile file) throws IOException {
        User user = currentUserService.resolve(principal);
        if (user == null) return Map.of("success", false, "message", "Not authenticated");

        var result = profileService.uploadAvatar(user, file);
        return result.success()
                ? Map.of("success", true, "avatarUrl", result.avatarUrl())
                : Map.of("success", false, "message", result.message());
    }


    @PostMapping("/avatar/delete")
    @ResponseBody
    public Map<String, Object> deleteAvatar(@AuthenticationPrincipal Object principal) {
        User user = currentUserService.resolve(principal);
        if (user == null) return Map.of("success", false, "message", "Not authenticated");

        profileService.deleteAvatar(user);
        return Map.of("success", true);
    }
}