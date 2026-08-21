package com.application.infera.controllers;

import com.application.infera.dtos.requests.WorkspaceRequest;
import com.application.infera.exception.WorkspaceAlreadyExistExeption;
import com.application.infera.exception.WorkspaceLimitReachedException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.repositories.UserRepository;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.NoteService;
import com.application.infera.services.ResourceService;
import com.application.infera.services.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequestMapping("/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final NoteService noteService;
    private final ResourceService resourceService;
    private final CurrentUserService currentUserService;


    // GET /workspaces — show all workspaces for the logged-in user
    @GetMapping
    public String listWorkspaces(@AuthenticationPrincipal Object principal, Model model) {
        User user = currentUserService.resolve(principal);

        if (user == null) return "redirect:/auth";

        List<Workspace> workspaces = workspaceService.getWorkspacesForUser(user);
        model.addAttribute("pageTitle", "Workspaces — INCAPTUR");
        model.addAttribute("workspaces", workspaces);
        model.addAttribute("user", user);
        model.addAttribute("workspaceRequest", new WorkspaceRequest());
        model.addAttribute("workspaceCount", workspaces.size());
        model.addAttribute("noteCount", noteService.countNotesForUser(user));
        model.addAttribute("wsNoteCount", noteService.getNoteCountsByWorkspace(user));
        model.addAttribute("resourceCount", resourceService.countResourcesForUser(user));
        return "workspaces";
    }

    // POST /workspaces — create a new workspace
    @PostMapping
    public String createWorkspace(@AuthenticationPrincipal Object principal,
                                  @ModelAttribute WorkspaceRequest workspaceRequest,
                                  RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);

        if (user == null) return "redirect:/auth";

        try {
            workspaceService.createWorkspace(workspaceRequest, user);
            redirectAttributes.addFlashAttribute("successMessage", String.format("Workspace \"%s\" created!", workspaceRequest.getName()));
        } catch (WorkspaceAlreadyExistExeption | WorkspaceLimitReachedException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }

        return "redirect:/workspaces";
    }

    // POST /workspaces/{id}/update — edit an existing workspace
    @PostMapping("/{id}/update")
    public String updateWorkspace(@AuthenticationPrincipal Object principal,
                                  @PathVariable Long id,
                                  @ModelAttribute WorkspaceRequest workspaceRequest,
                                  RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);

        if (user == null) return "redirect:/signin";

        try {
            workspaceService.updateWorkspace(id, workspaceRequest, user);
            redirectAttributes.addFlashAttribute("successMessage", "Workspace updated!");
        } catch (WorkspaceAlreadyExistExeption | WorkspaceNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }

        return "redirect:/workspaces";
    }

    // POST /workspaces/{id}/delete — remove a workspace
    @PostMapping("/{id}/delete")
    public String deleteWorkspace(@AuthenticationPrincipal Object principal,
                                  @PathVariable Long id,
                                  RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/signin";

        try {
            workspaceService.deleteWorkspace(id, user);
            redirectAttributes.addFlashAttribute("successMessage", "Workspace deleted.");
        } catch (WorkspaceNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }

        return "redirect:/workspaces";
    }


}