package com.application.infera.controllers;

import com.application.infera.exception.NoteNotFoundException;
import com.application.infera.exception.WorkspaceAccessDeniedException;
import com.application.infera.exception.WorkspaceLimitReachedException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.User;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.NoteService;
import com.application.infera.services.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/bin")
@RequiredArgsConstructor
public class BinController {

    private final NoteService noteService;
    private final WorkspaceService workspaceService;
    private final CurrentUserService currentUserService;

    // POST /bin/notes/{id}/restore — EDITOR or OWNER. returnTo is whitelisted, never used as a raw URL.
    @PostMapping("/notes/{id}/restore")
    public String restoreNote(@AuthenticationPrincipal Object principal,
                              @PathVariable Long id,
                              @RequestParam(name = "returnTo", defaultValue = "notes") String returnTo,
                              RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";

        try {
            String title = noteService.restoreNote(id, user);
            redirectAttributes.addFlashAttribute("successMessage", "\"" + title + "\" restored.");
        } catch (NoteNotFoundException | WorkspaceAccessDeniedException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "workspaces".equals(returnTo) ? "redirect:/workspaces" : "redirect:/notes";
    }

    // POST /bin/workspaces/{id}/restore — OWNER only
    @PostMapping("/workspaces/{id}/restore")
    public String restoreWorkspace(@AuthenticationPrincipal Object principal,
                                   @PathVariable Long id,
                                   RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";

        try {
            String name = workspaceService.restoreWorkspace(id, user);
            redirectAttributes.addFlashAttribute("successMessage", "Workspace \"" + name + "\" restored.");
        } catch (WorkspaceNotFoundException | WorkspaceAccessDeniedException | WorkspaceLimitReachedException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/workspaces";
    }
}