package com.application.infera.services;

import com.application.infera.dtos.requests.WorkspaceRequest;
import com.application.infera.exception.WorkspaceAlreadyExistExeption;
import com.application.infera.exception.WorkspaceLimitReachedException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.repositories.WorkspaceRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;

    public WorkspaceService(WorkspaceRepository workspaceRepository) {
        this.workspaceRepository = workspaceRepository;
    }

    // Create a new workspace linked to the logged-in user
    public void createWorkspace(WorkspaceRequest request, User user) {
        if (workspaceRepository.existsByNameAndUser(request.getName(), user)) {
            throw new WorkspaceAlreadyExistExeption("You already have a workspace named \"" + request.getName() + "\"");
        }
      if(countWorkspacesForUser(user) > 8){
          throw new WorkspaceLimitReachedException("Workspace Creation Limit Reached");
      }

        Workspace workspace = new Workspace();
        workspace.setName(request.getName());
        workspace.setDescription(request.getDescription());
        workspace.setColor(request.getColor() != null ? request.getColor() : "#ea580c");
        workspace.setUser(user);  // link to the signed-in user

        workspaceRepository.save(workspace);
    }

    // Get all workspaces for a user
    public List<Workspace> getWorkspacesForUser(User user) {
        return workspaceRepository.findByUserOrderByCreatedAtDesc(user);
    }

    // Count workspaces for dashboard stat card
    public long countWorkspacesForUser(User user) {
        return workspaceRepository.countByUser(user);
    }

    // Get a single workspace, scoped to the owner (used before edit/delete)
    public Workspace getWorkspaceForUser(Long id, User user) {
        return workspaceRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found"));
    }

    // Update an existing workspace — only if it belongs to this user
    public void updateWorkspace(Long id, WorkspaceRequest request, User user) {
        Workspace workspace = getWorkspaceForUser(id, user);

        // If renaming, make sure the new name isn't already taken by another workspace
        boolean nameChanged = !workspace.getName().equalsIgnoreCase(request.getName());
        if (nameChanged && workspaceRepository.existsByNameAndUser(request.getName(), user)) {
            throw new WorkspaceAlreadyExistExeption("You already have a workspace named \"" + request.getName() + "\"");
        }

        workspace.setName(request.getName());
        workspace.setDescription(request.getDescription());
        workspace.setColor(request.getColor() != null ? request.getColor() : workspace.getColor());

        workspaceRepository.save(workspace);
    }

    // Delete a workspace — only if it belongs to this user
    public void deleteWorkspace(Long id, User user) {
        Workspace workspace = getWorkspaceForUser(id, user);
        workspaceRepository.delete(workspace);
    }
    public long countAllWorkspaces(){
        return workspaceRepository.count();
    }
}