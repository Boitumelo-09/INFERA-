package com.application.infera.config;

import com.application.infera.models.User;
import com.application.infera.services.InvitationService;
import com.application.infera.services.NoteService;
import com.application.infera.services.ResourceService;
import com.application.infera.services.WorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import java.util.Map;

/* Supplies the sidebar's numbers to every full page, so controllers don't have to.
   Runs only when a page view is about to render: JSON endpoints and redirects never reach it. */
@Component
@RequiredArgsConstructor
public class SidebarModelInterceptor implements HandlerInterceptor {

    private final WorkspaceService workspaceService;
    private final NoteService noteService;
    private final ResourceService resourceService;
    private final InvitationService invitationService;

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response,
                           Object handler, ModelAndView mav) {
        if (mav == null || !mav.hasView()) return;
        String view = mav.getViewName();
        if (view == null || view.startsWith("redirect:") || view.startsWith("forward:")) return;

        Map<String, Object> model = mav.getModel();
        if (!(model.get("user") instanceof User user)) return;   // public pages: nothing to add

        // putIfAbsent semantics: a controller that already set a value wins, and costs no extra query
        if (!model.containsKey("workspaceCount"))
            mav.addObject("workspaceCount", workspaceService.countWorkspacesForUser(user));
        if (!model.containsKey("noteCount"))
            mav.addObject("noteCount", noteService.countNotesForUser(user));
        if (!model.containsKey("resourceCount"))
            mav.addObject("resourceCount", resourceService.countResourcesForUser(user));
        if (!model.containsKey("pendingInvitationCount"))
            mav.addObject("pendingInvitationCount", invitationService.countPendingForUser(user));
    }
}