package com.application.infera.controllers;

import com.application.infera.models.User;
import com.application.infera.services.*;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.*;
import java.time.format.DateTimeFormatter;

@Controller
@RequiredArgsConstructor
public class DashboardController {

    private final CurrentUserService currentUserService;
    private final WorkspaceService workspaceService;
    private final NoteService noteService;
    private final TagService tagService;
    private final ResourceService resourceService;
    private final ActivityService activityService;

    @GetMapping("/dashboard")
    public String dashboard(@AuthenticationPrincipal Object principal, Model model, HttpSession session) {
        System.out.println(model.asMap());
        User user = currentUserService.resolve(principal);

        if (user == null) {
            return "redirect:/auth";
        }

        model.addAttribute("user", user);
        model.addAttribute("showWelcomeModal", !user.isHasSeenWelcome());
        System.out.println(".".repeat(50));
        System.out.println("LOGGED IN USER    : "+ "\u001B[32m" + user.getFirstName() + " " + user.getLastName() + "\u001B[0m");
        System.out.println("Localed Session ID: "+ "\u001B[32m" + user.getId()+"\u001B[0m");
        System.out.println("Browser Session ID: "+ "\u001B[32m" + session.getId()+"\u001B[0m");
        System.out.println("Browser Session ID: "+ "\u001B[32m" + LocalTime.now(ZoneId.of("Africa/Johannesburg")).format(DateTimeFormatter.ofPattern("HH:mm:ss")) +"\u001B[0m");
        System.out.println(".".repeat(50));
        model.addAttribute("pageTitle","Dashboard — INCAPTUR");
        model.addAttribute("workspaces", workspaceService.getWorkspacesForUser(user));
        model.addAttribute("workspaceCount", workspaceService.countWorkspacesForUser(user));
        model.addAttribute("notesCount", noteService.countNotesForUser(user));
        model.addAttribute("notes",noteService.getNotesForUser(user));
        model.addAttribute("wsNoteCount",noteService.getNoteCountsByWorkspace(user));
        model.addAttribute("tagCount",tagService.countTagsForUser(user));
        model.addAttribute("resourceCount",resourceService.countResourcesForUser(user));
        model.addAttribute("workspaceResourceCount",resourceService.getResourceCountsByWorkspace(user));
        model.addAttribute("weeklyNotes", activityService.countWeeklyByPrefix(user, "NOTE_"));
        model.addAttribute("weeklyResources", activityService.countWeeklyByPrefix(user, "RESOURCE_"));
        model.addAttribute("weeklyWorkspaces", activityService.countWeeklyByPrefix(user, "WORKSPACE_"));
        model.addAttribute("dailyActivityCounts", activityService.getWeeklyDailyCounts(user));
        model.addAttribute("recentActivities", activityService.getRecentActivities(user, 10));
        return "dashboard";
    }


}