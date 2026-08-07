package com.application.infera.controllers;

import com.application.infera.dtos.requests.ResourceRequest;
import com.application.infera.exception.NoteNotFoundException;
import com.application.infera.exception.ResourceNotFoundException;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.CustomUserDetails;
import com.application.infera.services.NoteService;
import com.application.infera.services.ResourceService;
import com.application.infera.services.WorkspaceService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/resources")
public class ResourceController {

    private final ResourceService resourceService;
    private final UserRepository userRepository;
    private final NoteService noteService;
    private final WorkspaceService workspaceService;

    public ResourceController(ResourceService resourceService, UserRepository userRepository, NoteService noteService, WorkspaceService workspaceService) {
        this.resourceService = resourceService;
        this.userRepository = userRepository;
        this.noteService = noteService;
        this.workspaceService = workspaceService;
    }

    @PostMapping
    public String createResource(@AuthenticationPrincipal Object principal,
                                 @ModelAttribute ResourceRequest resourceRequest,
                                 RedirectAttributes redirectAttributes) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        try {
            resourceService.createResource(resourceRequest, user);
            redirectAttributes.addFlashAttribute("successMessage", "Resource added!");
        } catch (NoteNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "That note could not be found.");
        } catch (IllegalArgumentException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Invalid resource category.");
        }

        return "redirect:/notes";
    }

    @PostMapping("/{id}/update")
    public String updateResource(@AuthenticationPrincipal Object principal,
                                 @PathVariable Long id,
                                 @ModelAttribute ResourceRequest resourceRequest,
                                 RedirectAttributes redirectAttributes) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        try {
            resourceService.updateResource(id, resourceRequest, user);
            redirectAttributes.addFlashAttribute("successMessage", "Resource updated!");
        } catch (ResourceNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }

        return "redirect:/notes";
    }

    @PostMapping("/{id}/delete")
    public String deleteResource(@AuthenticationPrincipal Object principal,
                                 @PathVariable Long id,
                                 RedirectAttributes redirectAttributes) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        try {
            resourceService.deleteResource(id, user);
            redirectAttributes.addFlashAttribute("successMessage", "Resource deleted.");
        } catch (ResourceNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }

        return "redirect:/notes";
    }
    @GetMapping
    public String listResources(@AuthenticationPrincipal Object principal, Model model) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        model.addAttribute("pageTitle", "Resources — INFERA");
        model.addAttribute("user", user);
        model.addAttribute("resourcesByCategory", resourceService.getResourcesGroupedByCategory(user));
        model.addAttribute("resourceCount", resourceService.countResourcesForUser(user));
        model.addAttribute("noteCount", noteService.countNotesForUser(user));
        model.addAttribute("workspaceCount", workspaceService.countWorkspacesForUser(user));

        return "resources";
    }
    private User resolveUser(Object principal) {
        if (principal instanceof CustomUserDetails ud) {
            return userRepository.findById(ud.getUser().getId()).orElse(null);
        }
        if (principal instanceof OAuth2User ou) {
            String email = ou.getAttribute("email");
            return email == null ? null : userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}