package com.application.infera.controllers;

import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.CustomUserDetails;
import com.application.infera.services.ActivityService;
import com.application.infera.services.NoteService;
import com.application.infera.services.ResourceService;
import com.application.infera.services.WorkspaceService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/activity")
public class ActivityController {

    private final ActivityService activityService;
    private final NoteService noteService;
    private final WorkspaceService workspaceService;
    private final UserRepository userRepository;
    private final ResourceService resourceService;

    public ActivityController(ActivityService activityService, NoteService noteService,
                              WorkspaceService workspaceService, UserRepository userRepository, ResourceService resourceService) {
        this.activityService = activityService;
        this.noteService = noteService;
        this.workspaceService = workspaceService;
        this.userRepository = userRepository;
        this.resourceService = resourceService;
    }

    @GetMapping
    public String showActivity(@AuthenticationPrincipal Object principal, Model model) {
        User user = resolveUser(principal);
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