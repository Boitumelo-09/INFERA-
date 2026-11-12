package com.application.infera.controllers;

import com.application.infera.exception.InvitationInvalidException;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

// Registered users' view of invitations addressed to THEIR email. Authenticated (not the public token page).
@Controller
@RequestMapping("/invitations")
@RequiredArgsConstructor
public class InvitationInboxController {

    private final InvitationService invitationService;
    private final CurrentUserService currentUserService;
    private final WorkspaceService workspaceService;
    private final NoteService noteService;
    private final ResourceService resourceService;

    // "/mine/{id}/..." (three segments) cannot collide with the public "/{token}/accept"
    @PostMapping("/mine/{id}/accept")
    public String accept(@PathVariable Long id,
                         @AuthenticationPrincipal Object principal,
                         RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";
        try {
            Workspace workspace = invitationService.acceptById(id, user);
            // use the SAME flash attribute name you fixed in InvitationController.accept
            redirectAttributes.addFlashAttribute("successMessage", "You joined " + workspace.getName() + ".");
            return "redirect:/workspaces";
        } catch (InvitationInvalidException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            return "redirect:/workspaces";
        }
    }

    @PostMapping("/mine/{id}/decline")
    public String decline(@PathVariable Long id,
                          @AuthenticationPrincipal Object principal,
                          RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";
        try {
            invitationService.declineById(id, user);
            redirectAttributes.addFlashAttribute("successMessage", "Invitation declined.");
        } catch (InvitationInvalidException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/workspaces";
    }
}