package com.application.infera.repositories;

import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    // Get all workspaces belonging to a specific user
    List<Workspace> findByUserOrderByCreatedAtDesc(User user);   // workspaces this user OWNS: used for account deletion only

    // Every workspace this user belongs to, in any role (what lists and pickers should show)
    @Query("SELECT w FROM Workspace w WHERE w.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user) " +
            "ORDER BY w.createdAt DESC")
    List<Workspace> findAccessibleByUser(@Param("user") User user);

    @Query("SELECT COUNT(m) FROM WorkspaceMember m WHERE m.user = :user")
    long countAccessibleByUser(@Param("user") User user);

    // Count how many workspaces a user has
    long countByUser(User user);

    // Check if a workspace name already exists for this user
    boolean existsByNameAndUser(String name, User user);
    

   
}
