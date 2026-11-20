package com.application.infera.controllers;

import com.application.infera.dtos.modalviews.InviteModalView;
import com.application.infera.exception.InvitationEmailMismatchException;
import com.application.infera.exception.InvitationInvalidException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.Invitation;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.InvitationService;
import com.application.infera.services.InvitationTokens;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Optional;

@Controller
@RequestMapping("/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;
    private final CurrentUserService currentUserService;

    // PUBLIC and read-only: it never changes anything, so a link scanner or prefetch is harmless.
    @GetMapping("/{token}")
    public String landing(@PathVariable String token,
                          @AuthenticationPrincipal Object principal,
                          HttpServletRequest request,
                          HttpServletResponse response,
                          RedirectAttributes redirectAttributes) {
        response.setHeader("Referrer-Policy", "no-referrer");   // the token is in the URL: don't leak it onward
        response.setHeader("Cache-Control", "no-store");

        User user = currentUserService.resolve(principal);

        Optional<Invitation> found = InvitationTokens.isWellFormed(token)
                ? invitationService.previewByToken(token) : Optional.empty();
        if (found.isEmpty()) {
            // one generic modal for every kind of bad token
            redirectAttributes.addFlashAttribute("inviteModal", InviteModalView.invalid());
            return user != null ? "redirect:/workspaces" : "redirect:/auth";
        }
        Invitation invitation = found.get();

        if (user == null) {
            // /auth builds its sign-in modal from this stored path; every login method then comes back here
            request.getSession().setAttribute(InvitationTokens.RETURN_PATH_SESSION_KEY, "/invitations/" + token);
            return "redirect:/auth";
        }

        if (!invitation.getEmail().equals(user.getEmail().toLowerCase())) {
            // keep the path too, so "Switch account" can bring the right account straight back
            request.getSession().setAttribute(InvitationTokens.RETURN_PATH_SESSION_KEY, "/invitations/" + token);
            boolean githubHidden = user.getEmail().toLowerCase().endsWith("@github.oauth");
            redirectAttributes.addFlashAttribute("inviteModal", InviteModalView.mismatch(invitation, githubHidden));
            return "redirect:/workspaces";
        }

        redirectAttributes.addFlashAttribute("inviteModal", InviteModalView.ready(invitation));
        return "redirect:/workspaces";
    }

    // "Switch account" in the wrong-account modal: drop the sign-in but keep the session, so the stored
    // invitation path survives and the next sign-in (email code or OAuth) lands back on the invitation.
    @PostMapping("/switch-account")
    public String switchAccount(Authentication authentication,
                                HttpServletRequest request,
                                HttpServletResponse response) {
        SecurityContextLogoutHandler handler = new SecurityContextLogoutHandler();
        handler.setInvalidateHttpSession(false);
        handler.logout(request, response, authentication);
        return "redirect:/auth";
    }

    // Accepting is a POST only (CSRF-protected, authenticated). Never on GET.
    @PostMapping("/{token}/accept")
    public String accept(@PathVariable String token,
                         @AuthenticationPrincipal Object principal,
                         RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";
        if (!InvitationTokens.isWellFormed(token)) return "redirect:/dashboard";

        try {
            Workspace workspace = invitationService.acceptByToken(token, user);
            redirectAttributes.addFlashAttribute("successMessage", "You joined " + workspace.getName() + ".");
            return "redirect:/workspaces";
        } catch (InvitationInvalidException | InvitationEmailMismatchException | WorkspaceNotFoundException e) {
            return "redirect:/invitations/" + token;     // the landing page shows the matching state
        }
    }


}