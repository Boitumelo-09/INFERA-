package com.application.infera.services;

import com.application.infera.enums.ActivityType;
import com.application.infera.enums.WorkspaceRole;
import com.application.infera.exception.InvitationEmailMismatchException;
import com.application.infera.exception.InvitationException;
import com.application.infera.exception.InvitationInvalidException;
import com.application.infera.models.Invitation;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.repositories.InvitationRepository;
import com.application.infera.repositories.UserRepository;
import com.application.infera.repositories.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final UserRepository userRepository;
    private final ActivityService activityService;

    @Value("${app.invitations.expiry-days:5}")
    private int expiryDays;
    @Value("${app.invitations.max-open-per-workspace:10}")
    private int maxOpenPerWorkspace;

    // The raw token exists only here, so the caller can put it in the email link and then discard it
    public record CreatedInvitation(Invitation invitation, String rawToken) {}

    // ── OWNER side ───────────────────────────────────────────────

    @Transactional
    public CreatedInvitation createInvitation(Long workspaceId, String rawEmail, WorkspaceRole role, User inviter) {
        Workspace workspace = workspaceAccessService.requireWorkspace(workspaceId, inviter, WorkspaceRole.OWNER);

        if (role != WorkspaceRole.EDITOR && role != WorkspaceRole.VIEWER) {
            throw new InvitationException("Invitations can only grant Editor or Viewer access.");
        }
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase();
        if (email.isEmpty() || email.length() > 150 || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new InvitationException("Enter a valid email address.");
        }
        if (email.equalsIgnoreCase(inviter.getEmail())) {
            throw new InvitationException("You already own this workspace.");
        }
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent() && workspaceMemberRepository.findMembership(workspace.getId(), existing.get()).isPresent()) {
            throw new InvitationException("That person is already a member of this workspace.");
        }

        LocalDateTime now = LocalDateTime.now();
        invitationRepository.revokeOpen(workspace, email, now);   // re-invite replaces the old one
        if (invitationRepository.countPending(workspace, now) >= maxOpenPerWorkspace) {
            throw new InvitationException("This workspace already has " + maxOpenPerWorkspace
                    + " pending invitations. Revoke one first.");
        }

        String rawToken = InvitationTokens.generate();
        Invitation invitation = new Invitation();
        invitation.setWorkspace(workspace);
        invitation.setEmail(email);
        invitation.setRole(role);
        invitation.setTokenHash(InvitationTokens.hash(rawToken));
        invitation.setInvitedBy(inviter);
        invitation.setExpiresAt(now.plusDays(expiryDays));
        try {
            invitationRepository.saveAndFlush(invitation);
        } catch (DataIntegrityViolationException e) {
            // two owners clicking at once: the one-open index let only one through
            throw new InvitationException("An invitation to this address was just created. Refresh and try again.");
        }
        activityService.log(inviter, ActivityType.MEMBER_INVITED, email, workspace);
        return new CreatedInvitation(invitation, rawToken);
    }

    @Transactional
    public void revokeInvitation(Long workspaceId, Long invitationId, User actor) {
        Workspace workspace = workspaceAccessService.requireWorkspace(workspaceId, actor, WorkspaceRole.OWNER);
        String email = invitationRepository.findById(invitationId)
                .filter(i -> i.getWorkspace().getId().equals(workspaceId))
                .map(Invitation::getEmail).orElse("an invitation");
        if (invitationRepository.revokeOpenById(invitationId, workspace, LocalDateTime.now()) == 0) {
            throw new InvitationException("That invitation is no longer pending.");
        }
        activityService.log(actor, ActivityType.MEMBER_INVITE_REVOKED, email, workspace);
    }

    @Transactional(readOnly = true)
    public List<Invitation> listPending(Long workspaceId, User owner) {
        Workspace workspace = workspaceAccessService.requireWorkspace(workspaceId, owner, WorkspaceRole.OWNER);
        return invitationRepository.findPendingByWorkspace(workspace, LocalDateTime.now());
    }

    // ── INVITEE side ─────────────────────────────────────────────

    // For the GET page: reads only, changes nothing. Empty for every kind of unusable token.
    @Transactional(readOnly = true)
    public Optional<Invitation> previewByToken(String rawToken) {
        return invitationRepository.findWithDetailsByTokenHash(InvitationTokens.hash(rawToken))
                .filter(i -> i.isPending(LocalDateTime.now()));
    }

    @Transactional(readOnly = true)
    public List<Invitation> pendingForUser(User user) {
        return invitationRepository.findPendingByEmail(user.getEmail().toLowerCase(), LocalDateTime.now());
    }

    // Badge count. Hidden-email GitHub users can never receive invitations, so skip the query for them.
    @Transactional(readOnly = true)
    public long countPendingForUser(User user) {
        String email = user.getEmail();
        if (email == null || email.endsWith("@github.oauth")) return 0;
        return invitationRepository.countPendingByEmail(email.toLowerCase(), LocalDateTime.now());
    }

    // Link flow: resolve the token, give the clear "wrong address" message, then the shared atomic accept
    @Transactional
    public Workspace acceptByToken(String rawToken, User user) {
        Invitation invitation = invitationRepository.findWithDetailsByTokenHash(InvitationTokens.hash(rawToken))
                .orElseThrow(InvitationInvalidException::new);
        if (invitation.isPending(LocalDateTime.now())
                && !invitation.getEmail().equals(user.getEmail().toLowerCase())) {
            throw new InvitationEmailMismatchException(maskEmail(invitation.getEmail()));
        }
        return acceptById(invitation.getId(), user);
    }

    // In-app flow (no token): the same atomic accept. Wrong person, used, revoked, expired => same generic error.
    @Transactional
    public Workspace acceptById(Long invitationId, User user) {
        LocalDateTime now = LocalDateTime.now();
        if (invitationRepository.markAccepted(invitationId, user, user.getEmail().toLowerCase(), now) == 0) {
            throw new InvitationInvalidException();
        }
        Invitation invitation = invitationRepository.findWithDetailsById(invitationId)
                .orElseThrow(InvitationInvalidException::new);
        int inserted = workspaceMemberRepository.insertIfAbsent(invitation.getWorkspace().getId(), user.getId(),
                invitation.getRole().name(), now);
        if (inserted == 1) {
            activityService.log(user, ActivityType.MEMBER_JOINED,
                    invitation.getWorkspace().getName(), invitation.getWorkspace());
        }
        return invitation.getWorkspace();
    }

    @Transactional
    public void declineById(Long invitationId, User user) {
        Invitation invitation = invitationRepository.findWithDetailsById(invitationId)
                .orElseThrow(InvitationInvalidException::new);
        if (invitationRepository.markDeclined(invitationId, user.getEmail().toLowerCase(), LocalDateTime.now()) == 0) {
            throw new InvitationInvalidException();
        }
        activityService.log(user, ActivityType.MEMBER_INVITE_DECLINED,
                invitation.getWorkspace().getName(), invitation.getWorkspace());
    }

    // "sipho@gmail.com" -> "s***@gmail.com"
    public static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "***" + email.substring(at);
    }
}