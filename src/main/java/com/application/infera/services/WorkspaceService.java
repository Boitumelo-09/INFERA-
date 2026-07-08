package com.application.infera.services;

import com.application.infera.dtos.requests.WorkspaceRequest;
import com.application.infera.exception.WorkspaceAlreadyExistExeption;
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
}