package com.application.infera.repositories;

import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.models.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
    List<WorkspaceMember> findByWorkspace(Workspace workspace);
    List<WorkspaceMember> findByUser(User user);

    // The single lookup behind every access check: this user's membership in this workspace, if any
    @Query("SELECT m FROM WorkspaceMember m JOIN FETCH m.workspace " +
            "WHERE m.workspace.id = :workspaceId AND m.user = :user")
    Optional<WorkspaceMember> findMembership(@Param("workspaceId") Long workspaceId,
                                             @Param("user") User user);
}
