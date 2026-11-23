package com.application.infera.controllers;

import com.application.infera.exception.NoteNotFoundException;
import com.application.infera.exception.WorkspaceAccessDeniedException;
import com.application.infera.exception.WorkspaceLimitReachedException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.User;
import com.application.infera.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import com.application.infera.config.RecycleBinProperties;
import org.springframework.http.HttpStatus;
import org.springframework.ui.Model;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Set;

@Controller
@RequestMapping("/bin")
@RequiredArgsConstructor
public class BinController {

    private final NoteService noteService;
    private final WorkspaceService workspaceService;
    private final CurrentUserService currentUserService;
    private final BinService binService;
    private final RecycleBinPurgeService recycleBinPurgeService;
    private final RecycleBinProperties recycleBinProperties;

    // GET /bin/workspace/{id}/panel — the workspace bin as an HTML fragment (EDITOR+; viewers and strangers get 404)
    @GetMapping("/workspace/{id}/panel")
    public String workspacePanel(@AuthenticationPrincipal Object principal,
                                 @PathVariable Long id,
                                 Model model) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";

        try {
            model.addAttribute("workspaceId", id);   // the Empty form will post to /bin/workspace/{id}/empty
            return panel(model, binService.workspacePanel(id, user), "/notes", false);
        } catch (WorkspaceNotFoundException | WorkspaceAccessDeniedException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);   // same answer for "no access" and "no such workspace"
        }
    }

    // GET /bin/panel — my personal bin as an HTML fragment (what I deleted in workspaces I own)
    @GetMapping("/panel")
    public String globalPanel(@AuthenticationPrincipal Object principal, Model model) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";

        return panel(model, binService.globalPanel(user), "/workspaces", true);
    }

    // Pages a restore may send you back to (the sidebar's own paths). Anything else gets the fallback,
    // so returnTo can never be used as an open redirect.
    private static final Set<String> RETURN_PATHS = java.util.Set.of(
            "/dashboard", "/workspaces", "/notes", "/resources", "/activity", "/profile", "/settings");

    private static String safePath(String returnTo, String fallback) {
        return returnTo != null && RETURN_PATHS.contains(returnTo) ? returnTo : fallback;
    }

    private String panel(Model model, BinService.BinPanel panel, String returnTo, boolean global) {
        model.addAttribute("items", panel.items());
        model.addAttribute("asOf", panel.asOf());          // posted back by the Empty form (5c)
        model.addAttribute("canEmpty", panel.canEmpty());  // the template never decides permissions itself
        model.addAttribute("returnTo", returnTo);   // where a note restore sends you back to
        model.addAttribute("global", global);
        model.addAttribute("retentionDays", recycleBinProperties.getRetentionDays());
        return "fragments/bin-panel :: binPanel";
    }

    // POST /bin/notes/{id}/restore — EDITOR or OWNER. returnTo is whitelisted, never used as a raw URL.
    @PostMapping("/notes/{id}/restore")
    public String restoreNote(@AuthenticationPrincipal Object principal,
                              @PathVariable Long id,
                              @RequestParam(name = "returnTo", defaultValue = "/notes") String returnTo,
                              RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";

        try {
            String title = noteService.restoreNote(id, user);
            redirectAttributes.addFlashAttribute("successMessage", "\"" + title + "\" restored.");
        } catch (NoteNotFoundException | WorkspaceAccessDeniedException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:" + safePath(returnTo, "/notes");
    }

    // POST /bin/workspace/{id}/empty — OWNER only. Permanently deletes the notes that were in this workspace's bin
    // when the panel was built (asOf); anything deleted after that is left alone.
    @PostMapping("/workspace/{id}/empty")
    public String emptyWorkspaceBin(@AuthenticationPrincipal Object principal,
                                    @PathVariable Long id,
                                    @RequestParam(name = "asOf", required = false)
                                    @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
                                    java.time.LocalDateTime asOf,
                                    @RequestParam(name = "returnTo", defaultValue = "/notes") String returnTo,
                                    RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";
        if (asOf == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Open the recycle bin again and retry.");
            return "redirect:" + safePath(returnTo, "/notes");
        }

        try {
            var result = recycleBinPurgeService.emptyWorkspaceBin(id, user, asOf);
            redirectAttributes.addFlashAttribute("successMessage", emptyMessage(result));
        } catch (WorkspaceNotFoundException | WorkspaceAccessDeniedException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:" + safePath(returnTo, "/notes");
    }

    // POST /bin/empty — my personal bin (what I deleted in workspaces I own). Scoped to the signed-in user by construction.
    @PostMapping("/empty")
    public String emptyPersonalBin(@AuthenticationPrincipal Object principal,
                                   @RequestParam(name = "asOf", required = false)
                                   @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
                                   java.time.LocalDateTime asOf,
                                   @RequestParam(name = "returnTo", defaultValue = "/workspaces") String returnTo,
                                   RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";
        if (asOf == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Open the recycle bin again and retry.");
            return "redirect:" + safePath(returnTo, "/workspaces");
        }

        var result = recycleBinPurgeService.emptyPersonalBin(user, asOf);
        redirectAttributes.addFlashAttribute("successMessage", emptyMessage(result));
        return "redirect:" + safePath(returnTo, "/workspaces");
    }

    private static String emptyMessage(com.application.infera.services.RecycleBinPurgeService.EmptyResult r) {
        if (r.purged() == 0 && r.notPurged() == 0) return "Nothing to delete.";
        String done = r.purged() == 1 ? "1 item" : r.purged() + " items";
        if (r.notPurged() == 0) return "Recycle bin emptied: " + done + " permanently deleted.";
        String left = r.notPurged() == 1 ? "1 item was" : r.notPurged() + " items were";
        return done + " permanently deleted. " + left + " left in the bin (restored in the meantime, or could not be deleted).";
    }

    // POST /bin/workspaces/{id}/restore — OWNER only
    @PostMapping("/workspaces/{id}/restore")
    public String restoreWorkspace(@AuthenticationPrincipal Object principal,
                                   @RequestParam(name = "returnTo", defaultValue = "/workspaces") String returnTo,
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
        return "redirect:" + safePath(returnTo, "/workspaces");
    }
}