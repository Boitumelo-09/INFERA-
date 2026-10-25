package com.application.infera.services;

import com.application.infera.enums.WorkspaceRole;
import com.application.infera.exception.WorkspaceAccessDeniedException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.models.WorkspaceMember;
import com.application.infera.repositories.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/* The ONE place that decides who may do what inside a workspace.
   Services call requireWorkspace(...) instead of writing their own ownership/role checks. */
@Service
@RequiredArgsConstructor
public class WorkspaceAccessService {

    private final WorkspaceMemberRepository workspaceMemberRepository;

    // Returns the workspace only if the user is a member with at least the given role.
    //  - not a member            -> WorkspaceNotFoundException (don't reveal that the id exists)
    //  - member, role too low    -> WorkspaceAccessDeniedException
    public Workspace requireWorkspace(Long workspaceId, User user, WorkspaceRole minimum) {
        WorkspaceMember membership = workspaceMemberRepository.findMembership(workspaceId, user)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found"));

        if (!membership.getRole().atLeast(minimum)) {
            throw new WorkspaceAccessDeniedException("You don't have permission to do that in this workspace");
        }
        return membership.getWorkspace();
    }
}