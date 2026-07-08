package com.application.infera.repositories;

import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    // Get all workspaces belonging to a specific user
    List<Workspace> findByUserOrderByCreatedAtDesc(User user);

    // Count how many workspaces a user has
    long countByUser(User user);

    // Check if a workspace name already exists for this user
    boolean existsByNameAndUser(String name, User user);
}
