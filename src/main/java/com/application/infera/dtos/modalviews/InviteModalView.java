package com.application.infera.dtos.modalviews;

import com.application.infera.models.Invitation;
import com.application.infera.models.User;
import com.application.infera.services.InvitationService;

import java.io.Serializable;

/** What an invitation modal needs to render. Holds no token; it travels through the session as a flash attribute. */
public record InviteModalView(String state,            // signin | ready | mismatch | invalid
                              String workspaceName,
                              String inviterName,
                              String roleLabel,
                              String maskedEmail,
                              boolean githubHidden,
                              Long invitationId) implements Serializable {

    public static InviteModalView invalid() {
        return new InviteModalView("invalid", null, null, null, null, false, null);
    }

    public static InviteModalView signIn(Invitation i) {
        return new InviteModalView("signin", i.getWorkspace().getName(), inviter(i), role(i),
                InvitationService.maskEmail(i.getEmail()), false, null);
    }

    public static InviteModalView ready(Invitation i) {
        return new InviteModalView("ready", i.getWorkspace().getName(), inviter(i), role(i),
                null, false, i.getId());
    }

    public static InviteModalView mismatch(Invitation i, boolean githubHidden) {
        return new InviteModalView("mismatch", i.getWorkspace().getName(), inviter(i), role(i),
                InvitationService.maskEmail(i.getEmail()), githubHidden, null);
    }

    private static String inviter(Invitation i) {
        User u = i.getInvitedBy();
        if (u == null) return "Someone";
        String name = ((u.getFirstName() == null ? "" : u.getFirstName()) + " "
                + (u.getLastName() == null ? "" : u.getLastName())).trim();
        return name.isEmpty() ? "Someone" : name;
    }

    private static String role(Invitation i) {
        String n = i.getRole().name();
        return n.charAt(0) + n.substring(1).toLowerCase();
    }
}