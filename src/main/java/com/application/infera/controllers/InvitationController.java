package com.application.infera.controllers;

import com.application.infera.exception.InvitationEmailMismatchException;
import com.application.infera.exception.InvitationInvalidException;
import com.application.infera.models.Invitation;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.InvitationService;
import com.application.infera.services.InvitationTokens;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
                          Model model) {
        response.setHeader("Referrer-Policy", "no-referrer");   // the token is in the URL: don't leak it onward
        response.setHeader("Cache-Control", "no-store");
        model.addAttribute("pageTitle", "invitation | incaptur");

        User user = currentUserService.resolve(principal);
        model.addAttribute("signedIn", user != null);

        Optional<Invitation> found = InvitationTokens.isWellFormed(token)
                ? invitationService.previewByToken(token) : Optional.empty();
        if (found.isEmpty()) {
            model.addAttribute("state", "invalid");     // one generic page for every kind of bad token
            return "invitation";
        }

        Invitation invitation = found.get();
        model.addAttribute("workspaceName", invitation.getWorkspace().getName());
        model.addAttribute("inviterName", fullName(invitation.getInvitedBy()));
        model.addAttribute("roleLabel", roleLabel(invitation));
        model.addAttribute("token", token);

        if (user == null) {
            // Remember where to come back to after OAuth sign-in (the success handler re-validates this)
            request.getSession().setAttribute(InvitationTokens.RETURN_PATH_SESSION_KEY, "/invitations/" + token);
            model.addAttribute("state", "signin");
        } else if (!invitation.getEmail().equals(user.getEmail().toLowerCase())) {
            model.addAttribute("state", "mismatch");
            model.addAttribute("maskedEmail", InvitationService.maskEmail(invitation.getEmail()));
        } else {
            model.addAttribute("state", "ready");
        }
        return "invitation";
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
        } catch (InvitationInvalidException | InvitationEmailMismatchException e) {
            return "redirect:/invitations/" + token;     // the landing page shows the matching state
        }
    }

    private static String fullName(User u) {
        String name = ((u.getFirstName() == null ? "" : u.getFirstName()) + " "
                + (u.getLastName() == null ? "" : u.getLastName())).trim();
        return name.isEmpty() ? "Someone" : name;
    }

    private static String roleLabel(Invitation invitation) {
        String name = invitation.getRole().name();
        return name.charAt(0) + name.substring(1).toLowerCase();
    }
}