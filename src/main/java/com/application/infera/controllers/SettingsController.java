package com.application.infera.controllers;

import com.application.infera.models.User;
import com.application.infera.repositories.*;
import com.application.infera.services.*;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Map;

@Controller
@RequestMapping("/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final WorkspaceService workspaceService;
    private final NoteService noteService;
    private final ResourceService resourceService;
    private final SettingsService settingsService;
    private final CurrentUserService currentUserService;

    
    @GetMapping
    public String settingsPage(@AuthenticationPrincipal Object principal, Model model) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/signin";

        boolean isOAuthUser = principal instanceof OAuth2User;
        model.addAttribute("user", user);
        model.addAttribute("pageTitle", "Settings — INFERA");
        model.addAttribute("isOAuthUser", isOAuthUser);
        model.addAttribute("resourceCount",resourceService.countResourcesForUser(user));
        model.addAttribute("workspaceCount", workspaceService.countWorkspacesForUser(user));
        model.addAttribute("notesCount", noteService.countNotesForUser(user));
        return "settings";
    }

    @PostMapping("/theme")
    @ResponseBody
    public Map<String, Object> updateTheme(@AuthenticationPrincipal Object principal,
                                           @RequestParam("theme") String theme) {

        User user = currentUserService.resolve(principal);
        if (user == null) return Map.of("success", false);

        boolean updated = settingsService.updateTheme(user, theme);
        return updated ? Map.of("success", true) : Map.of("success", false, "message", "Invalid theme");
    }



    @PostMapping("/delete-account")
    public String deleteAccount(@AuthenticationPrincipal Object principal,
                                @RequestParam("confirmText") String confirmText,
                                HttpServletRequest request) throws ServletException {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/signin";
        if (!"DELETE".equals(confirmText)) {
            return "redirect:/settings?error=confirm";
        }
       settingsService.deleteUser(user);
        request.logout();
        return "redirect:/signin?deleted=true";
    }


}