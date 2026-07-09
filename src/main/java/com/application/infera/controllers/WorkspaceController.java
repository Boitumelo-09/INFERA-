package com.application.infera.controllers;

import com.application.infera.dtos.requests.WorkspaceRequest;
import com.application.infera.exception.WorkspaceAlreadyExistExeption;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.security.CustomUserDetails;
import com.application.infera.services.WorkspaceService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.application.infera.repositories.UserRepository;

import java.util.List;

@Controller
@RequestMapping("/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final UserRepository userRepository;

    public WorkspaceController(WorkspaceService workspaceService, UserRepository userRepository) {
        this.workspaceService = workspaceService;
        this.userRepository = userRepository;
    }

    // GET /workspaces — show all workspaces for the logged-in user
    @GetMapping
    public String listWorkspaces(@AuthenticationPrincipal Object principal, Model model) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        List<Workspace> workspaces = workspaceService.getWorkspacesForUser(user);
        model.addAttribute("workspaces", workspaces);
        model.addAttribute("user", user);
        model.addAttribute("workspaceRequest", new WorkspaceRequest());
        model.addAttribute("pageTitle", "Workspaces — INFERA");
        return "workspaces";
    }

    // POST /workspaces — create a new workspace
    @PostMapping
    public String createWorkspace(@AuthenticationPrincipal Object principal,
                                  @ModelAttribute WorkspaceRequest workspaceRequest,
                                  RedirectAttributes redirectAttributes) {
        System.out.println("Someone tries to create a workspace");
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        try {
            workspaceService.createWorkspace(workspaceRequest, user);
            redirectAttributes.addFlashAttribute("successMessage", "Workspace \"" + workspaceRequest.getName() + "\" created!");
        } catch (WorkspaceAlreadyExistExeption e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }

        return "redirect:/dashboard";
    }

    // Resolves the logged-in user regardless of login method
    private User resolveUser(Object principal) {
        if (principal instanceof CustomUserDetails ud) {
            return ud.getUser();
        }
        if (principal instanceof OAuth2User ou) {
            String email = ou.getAttribute("email");
            if (email == null) return null;
            return userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}