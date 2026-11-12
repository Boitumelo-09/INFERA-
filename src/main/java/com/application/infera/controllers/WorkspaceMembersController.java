package com.application.infera.controllers;

import com.application.infera.enums.WorkspaceRole;
import com.application.infera.exception.InvitationException;
import com.application.infera.exception.MembershipException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.services.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Slf4j
@Controller
@RequestMapping("/workspaces/{workspaceId}/members")
@RequiredArgsConstructor
public class WorkspaceMembersController {

    private final InvitationService invitationService;
    private final MailService mailService;
    private final WorkspaceAccessService workspaceAccessService;
    private final CurrentUserService currentUserService;
    private final WorkspaceService workspaceService;
    private final NoteService noteService;
    private final ResourceService resourceService;

    @Value("${app.invitations.expiry-days:5}")
    private int expiryDays;



    // Returns ONLY the hub fragment (no page); the workspaces page fetches it when the modal opens
    @GetMapping("/panel")
    public String panel(@PathVariable Long workspaceId,
                        @AuthenticationPrincipal Object principal,
                        Model model) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";
        WorkspaceService.Hub hub = workspaceService.getHub(workspaceId, user);
        model.addAttribute("hub", hub);
        if (hub.isOwner()) {
            model.addAttribute("pending", invitationService.listPending(workspaceId, user));
        }
        return "fragments/members-hub :: hub";
    }

    @PostMapping("/invitations")
    public String invite(@PathVariable Long workspaceId,
                         @RequestParam("email") String email,
                         @RequestParam("role") WorkspaceRole role,
                         @AuthenticationPrincipal Object principal,
                         RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";

        try {
            // 1) save (own transaction, committed when this returns)
            InvitationService.CreatedInvitation created =
                    invitationService.createInvitation(workspaceId, email, role, user);
            // 2) only then send: a mail failure can never roll back or hide the saved invitation
            try {
                String roleName = created.invitation().getRole().name();
                mailService.sendInvitationEmail(
                        created.invitation().getEmail(),
                        fullName(user),
                        created.invitation().getWorkspace().getName(),
                        roleName.charAt(0) + roleName.substring(1).toLowerCase(),
                        created.rawToken(),
                        expiryDays);
                redirectAttributes.addFlashAttribute("successMessage", "Invitation sent to " + created.invitation().getEmail() + ".");
            } catch (RuntimeException mailFailure) {
                log.error("Invitation email failed for workspace {}", workspaceId, mailFailure);   // never log the token
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Invitation saved, but the email could not be sent. Click Invite again to retry.");
            }
        } catch (InvitationException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        redirectAttributes.addFlashAttribute("openMembers", workspaceId);
        return "redirect:/workspaces";
    }

    @PostMapping("/{memberId}/remove")
    public String remove(@PathVariable Long workspaceId,
                         @PathVariable Long memberId,
                         @AuthenticationPrincipal Object principal,
                         RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";
        try {
            String name = workspaceService.removeMember(workspaceId, memberId, user);
            redirectAttributes.addFlashAttribute("successMessage", name + " was removed.");
            redirectAttributes.addFlashAttribute("openMembers", workspaceId);
        } catch (MembershipException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            redirectAttributes.addFlashAttribute("openMembers", workspaceId);
        } catch (WorkspaceNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/workspaces";
    }

    @PostMapping("/leave")
    public String leave(@PathVariable Long workspaceId,
                        @AuthenticationPrincipal Object principal,
                        RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";
        try {
            String name = workspaceService.leaveWorkspace(workspaceId, user);
            redirectAttributes.addFlashAttribute("successMessage", "You left \"" + name + "\".");
        } catch (MembershipException | WorkspaceNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/workspaces";
    }

    @PostMapping("/invitations/{invitationId}/revoke")
    public String revoke(@PathVariable Long workspaceId,
                         @PathVariable Long invitationId,
                         @AuthenticationPrincipal Object principal,
                         RedirectAttributes redirectAttributes) {
        User user = currentUserService.resolve(principal);
        if (user == null) return "redirect:/auth";
        try {
            invitationService.revokeInvitation(workspaceId, invitationId, user);
            redirectAttributes.addFlashAttribute("successMessage", "Invitation revoked.");
        } catch (InvitationException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        redirectAttributes.addFlashAttribute("openMembers", workspaceId);
        return "redirect:/workspaces";
    }

    private static String fullName(User user) {
        String name = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
        return name.isEmpty() ? "Someone" : name;
    }
}