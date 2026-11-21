package com.application.infera.services;

import com.application.infera.enums.Role;
import com.application.infera.enums.WorkspaceRole;
import com.application.infera.exception.NoteNotFoundException;
import com.application.infera.exception.ResourceNotFoundException;
import com.application.infera.exception.WorkspaceAccessDeniedException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.*;
import com.application.infera.repositories.NoteRepository;
import com.application.infera.repositories.ResourceRepository;
import com.application.infera.repositories.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/* The ONE place that decides who may do what inside a workspace.
   Services call requireWorkspace(...) instead of writing their own ownership/role checks. */
@Service
@RequiredArgsConstructor
public class WorkspaceAccessService {

    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final NoteRepository noteRepository;
    private final ResourceRepository resourceRepository;
    // Returns the workspace only if the user is a member with at least the given role.
    //  - not a member            -> WorkspaceNotFoundException (don't reveal that the id exists)
    //  - member, role too low    -> WorkspaceAccessDeniedException
    public Workspace requireWorkspace(Long workspaceId, User user, WorkspaceRole minimum) {
        WorkspaceMember membership = workspaceMemberRepository.findMembership(workspaceId, user)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found"));

        if (!membership.getRole().atLeast(minimum)) {
            throw new WorkspaceAccessDeniedException("You are not permitted to do that in this workspace");
        }
        return membership.getWorkspace();
    }

    // Returns the note only if the user is a member of ITS workspace with at least the given role.
    //  - note missing, or user not a member -> NoteNotFoundException (same answer for both)
    //  - member, role too low               -> WorkspaceAccessDeniedException
    public Note requireNote(Long noteId, User user, WorkspaceRole minimum) {
        WorkspaceMember membership = workspaceMemberRepository.findMembershipForNote(noteId, user)
                .orElseThrow(() -> new NoteNotFoundException("Note not found"));

        if (!membership.getRole().atLeast(minimum)) {
            throw new WorkspaceAccessDeniedException("You are not permitted to do that in this workspace");
        }
        return noteRepository.findByIdAndWorkspaceAndDeletedAtIsNull(noteId, membership.getWorkspace())
                .orElseThrow(() -> new NoteNotFoundException("Note not found"));
    }

    // Same idea for a resource: its workspace is reached through its note.
    public Resource requireResource(Long resourceId, User user, WorkspaceRole minimum) {
        WorkspaceMember membership = workspaceMemberRepository.findMembershipForResource(resourceId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        if (!membership.getRole().atLeast(minimum)) {
            throw new WorkspaceAccessDeniedException("You are not permitted to do that in this workspace");
        }
        return resourceRepository.findByIdAndNote_Workspace(resourceId, membership.getWorkspace())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
    }
    // RESTORE gate for a note in the bin. The note's workspace must be live (a note in a binned workspace
    // is refused: restore the workspace first), the note must not be expired, and the role must be enough.
    public Note requireDeletedNote(Long noteId, User user, WorkspaceRole minimum, java.time.LocalDateTime cutoff) {
        WorkspaceMember membership = workspaceMemberRepository.findMembershipForDeletedNote(noteId, user, cutoff)
                .orElseThrow(() -> new NoteNotFoundException("That note is no longer in the bin."));

        if (!membership.getRole().atLeast(minimum)) {
            throw new WorkspaceAccessDeniedException("You are not permitted to do that in this workspace");
        }
        return noteRepository.findByIdAndWorkspace(noteId, membership.getWorkspace())
                .orElseThrow(() -> new NoteNotFoundException("That note is no longer in the bin."));
    }

    // RESTORE gate for a workspace in the bin (not expired). Callers pass OWNER.
    public Workspace requireDeletedWorkspace(Long workspaceId, User user, WorkspaceRole minimum, java.time.LocalDateTime cutoff) {
        WorkspaceMember membership = workspaceMemberRepository.findMembershipForDeletedWorkspace(workspaceId, user, cutoff)
                .orElseThrow(() -> new WorkspaceNotFoundException("That workspace is no longer in the bin."));

        if (!membership.getRole().atLeast(minimum)) {
            throw new WorkspaceAccessDeniedException("You are not permitted to do that in this workspace");
        }
        return membership.getWorkspace();
    }

    public Optional<WorkspaceMember> requireRole(Long workspaceId, User user) {
        return workspaceMemberRepository.findMembership(workspaceId,user);
    }
}