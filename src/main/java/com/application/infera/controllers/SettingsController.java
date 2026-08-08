package com.application.infera.controllers;

import com.application.infera.models.User;
import com.application.infera.repositories.*;
import com.application.infera.security.CustomUserDetails;
import com.application.infera.services.NoteService;
import com.application.infera.services.ResourceService;
import com.application.infera.services.WorkspaceService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
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

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NoteRepository noteRepository;
    private final ResourceRepository resourceRepository;
    private final ActivityRepository activityRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceService workspaceService;
    private final NoteService noteService;
    private final ResourceService resourceService;
    
    @GetMapping
    public String settingsPage(@AuthenticationPrincipal Object principal, Model model) {
        User user = resolveUser(principal);
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
        User user = resolveUser(principal);
        if (user == null) return Map.of("success", false);
        if (!theme.equals("default") && !theme.equals("dark") && !theme.equals("light")) {
            return Map.of("success", false, "message", "Invalid theme");
        }
        user.setThemePreference(theme);
        userRepository.save(user);
        return Map.of("success", true);
    }

    @PostMapping("/password")
    public String changePassword(@AuthenticationPrincipal Object principal,
                                 @RequestParam("currentPassword") String currentPassword,
                                 @RequestParam("newPassword") String newPassword,
                                 @RequestParam("confirmPassword") String confirmPassword,
                                 RedirectAttributes redirectAttributes) {
        User user = resolveUser(principal);
        if (user == null || principal instanceof OAuth2User) return "redirect:/signin";

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            redirectAttributes.addFlashAttribute("toastError", "Current password is incorrect");
            return "redirect:/settings";
        }
        if (!newPassword.equals(confirmPassword)) {
            redirectAttributes.addFlashAttribute("toastError", "New passwords don't match");
            return "redirect:/settings";
        }
        if (newPassword.length() < 8) {
            redirectAttributes.addFlashAttribute("toastError", "Password must be at least 8 characters");
            return "redirect:/settings";
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        redirectAttributes.addFlashAttribute("toast", "Password updated");
        return "redirect:/settings";
    }

    @PostMapping("/delete-account")
    public String deleteAccount(@AuthenticationPrincipal Object principal,
                                @RequestParam("confirmText") String confirmText,
                                HttpServletRequest request) throws ServletException {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";
        if (!"DELETE".equals(confirmText)) {
            return "redirect:/settings?error=confirm";
        }

        // TODO: cascade delete in order — needs actual repository method names,
        // I don't have NoteRepository/ResourceRepository/TagRepository/ActivityRepository/WorkspaceRepository
        // to avoid hallucinating query methods. Rough shape needed:
        // 1. resourceRepository.deleteAllByNote_Workspace_User(user)
        // 2. noteRepository.deleteAllByWorkspace_User(user)  (note_tags join rows cascade via JPA @ManyToMany if configured, else need explicit clear)
        // 3. activityRepository.deleteAllByUser(user)
        // 4. workspaceRepository.deleteAllByUser(user)
        // 5. userRepository.delete(user)
        var notes = noteRepository.findByWorkspace_User(user);
        var resources = resourceRepository.findByNote_Workspace_UserOrderByCreatedAtDesc(user);
        resourceRepository.deleteAll(resources);
        for (var note : notes) note.getTags().clear(); // clears note_tags join rows, tags themselves are shared/global and stay
        noteRepository.saveAll(notes);
        noteRepository.deleteAll(notes);
        activityRepository.deleteAll(activityRepository.findByUserOrderByCreatedAtDesc(user));
        workspaceRepository.deleteAll(workspaceRepository.findByUserOrderByCreatedAtDesc(user));
        userRepository.delete(user);

        request.logout();
        return "redirect:/signin?deleted=true";
    }

    private User resolveUser(Object principal) {
        if (principal instanceof CustomUserDetails userDetails) {
            return userRepository.findById(userDetails.getUser().getId()).orElse(null);
        }
        if (principal instanceof OAuth2User oAuth2User) {
            String email = oAuth2User.getAttribute("email");
            return email == null ? null : userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}