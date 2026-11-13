package com.application.infera.services;


import com.application.infera.dtos.requests.WorkspaceRequest;
import com.application.infera.enums.ActivityType;
import com.application.infera.enums.WorkspaceRole;
import com.application.infera.exception.MembershipException;
import com.application.infera.exception.WorkspaceAlreadyExistExeption;
import com.application.infera.exception.WorkspaceLimitReachedException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.models.WorkspaceMember;
import com.application.infera.repositories.*;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@AllArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final ActivityService activityService;
    private final NoteRepository noteRepository;
    private final ResourceRepository resourceRepository;
    private final ActivityRepository activityRepository;
    private final DrawingRepository drawingRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final InvitationRepository invitationRepository;

    // Create a new workspace linked to the logged-in user
    @Transactional
    public void createWorkspace(WorkspaceRequest request, User user) {
        if (workspaceRepository.existsByNameAndUser(request.getName(), user)) {
            throw new WorkspaceAlreadyExistExeption("You already have a workspace named \"" + request.getName() + "\"");
        }
        if (workspaceRepository.countByUser(user) > 8) {
            // the limit applies to workspaces you OWN, not ones shared with you
            throw new WorkspaceLimitReachedException("Workspace Creation Limit Reached");
        }

        Workspace workspace = new Workspace();
        workspace.setName(request.getName());
        workspace.setDescription(request.getDescription());
        workspace.setColor(request.getColor() != null ? request.getColor() : "#ea580c");
        workspace.setUser(user);  // link to the signed-in user

        workspaceRepository.save(workspace);

        // Every workspace has an OWNER membership row, written in the same transaction
        WorkspaceMember ownerMembership = new WorkspaceMember();
        ownerMembership.setWorkspace(workspace);
        ownerMembership.setUser(user);
        ownerMembership.setRole(WorkspaceRole.OWNER);
        workspaceMemberRepository.save(ownerMembership);

        activityService.log(user, ActivityType.WORKSPACE_CREATED, workspace.getName(), workspace);

    }

    // Get all workspaces for a user
    public List<Workspace> getWorkspacesForUser(User user) {
        return workspaceRepository.findAccessibleByUser(user);
    }

    // Count workspaces for dashboard stat card
    public long countWorkspacesForUser(User user) {
        return workspaceRepository.countAccessibleByUser(user);
    }



    // Update an existing workspace — only if it belongs to this user
    public void updateWorkspace(Long id, WorkspaceRequest request, User user) {
        Workspace workspace = workspaceAccessService.requireWorkspace(id, user, WorkspaceRole.OWNER);

        // If renaming, make sure the new name isn't already taken by another workspace
        boolean nameChanged = !workspace.getName().equalsIgnoreCase(request.getName());
        if (nameChanged && workspaceRepository.existsByNameAndUser(request.getName(), user)) {
            throw new WorkspaceAlreadyExistExeption("You already have a workspace named \"" + request.getName() + "\"");
        }

        workspace.setName(request.getName());
        workspace.setDescription(request.getDescription());
        workspace.setColor(request.getColor() != null ? request.getColor() : workspace.getColor());

        workspaceRepository.save(workspace);
        activityService.log(user, ActivityType.WORKSPACE_UPDATED, workspace.getName(), workspace);
    }

    // Delete a workspace — only if it belongs to this user
    @Transactional
    public void deleteWorkspace(Long id, User user) {
        Workspace workspace = workspaceAccessService.requireWorkspace(id, user, WorkspaceRole.OWNER);
        var wsNotes = noteRepository.findByWorkspaceOrderByUpdatedAtDesc(workspace);
        var wsDrawings = drawingRepository.findDrawingByNote_Workspace(workspace);
        drawingRepository.deleteAll(wsDrawings);
        for (var note : wsNotes) {
            resourceRepository.deleteAll(resourceRepository.findByNoteOrderByCreatedAtDesc(note));
            note.getTags().clear();
        }
        noteRepository.saveAll(wsNotes);
        noteRepository.deleteAll(wsNotes);
        activityRepository.deleteAll(activityRepository.findByWorkspace(workspace));
        invitationRepository.deleteByWorkspace(workspace);
        workspaceMemberRepository.deleteAll(workspaceMemberRepository.findByWorkspace(workspace));
        workspaceRepository.delete(workspace);
        activityService.log(user, ActivityType.WORKSPACE_DELETED, workspace.getName(), null);
    }

    // What one tile needs: my role, how many members, and the first few to draw as avatars
    public record TileMembers(WorkspaceRole myRole, int total, List<WorkspaceMember> preview) {
        public boolean isOwner() { return myRole == WorkspaceRole.OWNER; }
    }

    @Transactional(readOnly = true)
    public Map<Long, TileMembers> getTileMembers(List<Workspace> workspaces, User user) {
        if (workspaces.isEmpty()) return Map.of();
        List<Long> ids = workspaces.stream().map(Workspace::getId).toList();

        Map<Long, List<WorkspaceMember>> byWorkspace = new HashMap<>();
        for (WorkspaceMember m : workspaceMemberRepository.findAllForWorkspaces(ids)) {
            byWorkspace.computeIfAbsent(m.getWorkspace().getId(), k -> new ArrayList<>()).add(m);
        }

        Map<Long, TileMembers> result = new HashMap<>();
        byWorkspace.forEach((wsId, members) -> {
            WorkspaceRole mine = members.stream()
                    .filter(m -> m.getUser().getId().equals(user.getId()))
                    .map(WorkspaceMember::getRole)
                    .findFirst().orElse(WorkspaceRole.VIEWER);   // least privilege if the row is somehow missing
            result.put(wsId, new TileMembers(mine, members.size(), members.stream().limit(3).toList()));
        });
        return result;
    }

    // Everything the members hub shows: any member may read it
    public record Hub(Workspace workspace, WorkspaceRole myRole, Long myUserId, List<WorkspaceMember> members) {
        public boolean isOwner() { return myRole == WorkspaceRole.OWNER; }
    }

    @Transactional(readOnly = true)
    public Hub getHub(Long workspaceId, User user) {
        Workspace workspace = workspaceAccessService.requireWorkspace(workspaceId, user, WorkspaceRole.VIEWER);
        List<WorkspaceMember> members = new ArrayList<>(workspaceMemberRepository.findAllForWorkspaces(List.of(workspaceId)));
        members.sort(Comparator.comparing(WorkspaceMember::getRole));   // enum order OWNER, EDITOR, VIEWER; sort is stable, so join order holds within a role
        WorkspaceRole mine = members.stream()
                .filter(m -> m.getUser().getId().equals(user.getId()))
                .map(WorkspaceMember::getRole)
                .findFirst().orElse(WorkspaceRole.VIEWER);
        return new Hub(workspace, mine, user.getId(), members);
    }

    // OWNER removes someone else. Returns the removed person's name for the toast.
    @Transactional
    public String removeMember(Long workspaceId, Long memberId, User actor) {
        Workspace workspace = workspaceAccessService.requireWorkspace(workspaceId, actor, WorkspaceRole.OWNER);
        WorkspaceMember target = workspaceMemberRepository.findByIdAndWorkspace(memberId, workspace)
                .orElseThrow(() -> new MembershipException("That member is no longer in this workspace."));
        if (target.getRole() == WorkspaceRole.OWNER) {
            throw new MembershipException("The owner can't be removed.");
        }
        String name = displayName(target.getUser());   // read before the delete
        if (workspaceMemberRepository.deleteNonOwnerById(memberId, workspace, WorkspaceRole.OWNER) == 0) {
            throw new MembershipException("That member is no longer in this workspace.");
        }
        return name;
    }

    // A non-owner leaves. Returns the workspace name for the toast.
    @Transactional
    public String leaveWorkspace(Long workspaceId, User user) {
        WorkspaceMember membership = workspaceMemberRepository.findMembership(workspaceId, user)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found"));
        if (membership.getRole() == WorkspaceRole.OWNER) {
            throw new MembershipException("Owners can't leave their own workspace. Delete it instead.");
        }
        String workspaceName = membership.getWorkspace().getName();
        if (workspaceMemberRepository.deleteNonOwnerMembership(membership.getWorkspace(), user, WorkspaceRole.OWNER) == 0) {
            throw new MembershipException("You are no longer a member of this workspace.");
        }
        return workspaceName;
    }

    // OWNER changes someone else's role to EDITOR or VIEWER. Returns the member's name for the toast.
    @Transactional
    public String changeMemberRole(Long workspaceId, Long memberId, WorkspaceRole newRole, User actor) {
        Workspace workspace = workspaceAccessService.requireWorkspace(workspaceId, actor, WorkspaceRole.OWNER);
        if (newRole != WorkspaceRole.EDITOR && newRole != WorkspaceRole.VIEWER) {
            throw new MembershipException("Members can only be Editor or Viewer.");
        }
        WorkspaceMember target = workspaceMemberRepository.findByIdAndWorkspace(memberId, workspace)
                .orElseThrow(() -> new MembershipException("That member is no longer in this workspace."));
        if (target.getRole() == WorkspaceRole.OWNER) {
            throw new MembershipException("The owner's role can't be changed.");
        }
        String name = displayName(target.getUser());   // read before the update
        if (workspaceMemberRepository.updateNonOwnerRole(memberId, workspace, newRole, WorkspaceRole.OWNER) == 0) {
            throw new MembershipException("That member is no longer in this workspace.");
        }
        return name;
    }

    private static String displayName(User u) {
        String name = ((u.getFirstName() == null ? "" : u.getFirstName()) + " "
                + (u.getLastName() == null ? "" : u.getLastName())).trim();
        return name.isEmpty() ? "The member" : name;
    }

    public long countAllWorkspaces() {
        return workspaceRepository.count();
    }
}