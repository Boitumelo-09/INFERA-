package com.application.infera.controllers;

import com.application.infera.models.User;
import com.application.infera.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/activity")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;
    private final NoteService noteService;
    private final WorkspaceService workspaceService;
    private final CurrentUserService currentUserService;
    private final ResourceService resourceService;


    @GetMapping
    public String showActivity(@AuthenticationPrincipal Object principal, Model model) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/signin";

        model.addAttribute("pageTitle", "Activity — INFERA");
        model.addAttribute("user", user);
        model.addAttribute("noteCount", noteService.countNotesForUser(user));
        model.addAttribute("workspaceCount", workspaceService.countWorkspacesForUser(user));

        model.addAttribute("totalActivities", activityService.getTotalActivityCount(user));
        model.addAttribute("currentStreak", activityService.getCurrentStreak(user));
        model.addAttribute("longestStreak", activityService.getLongestStreak(user));
        model.addAttribute("categoryBreakdown", activityService.getCategoryBreakdown(user));
        model.addAttribute("monthlyDailyCounts", activityService.getMonthlyDailyCounts(user));
        model.addAttribute("recentActivities", activityService.getRecentActivities(user, 30));
        model.addAttribute("resourceCount",resourceService.countResourcesForUser(user));
        return "activity";
    }


}