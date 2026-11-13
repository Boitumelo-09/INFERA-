package com.application.infera.repositories;

import com.application.infera.enums.WorkspaceRole;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.models.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
    List<WorkspaceMember> findByWorkspace(Workspace workspace);
    List<WorkspaceMember> findByUser(User user);

    @Query("SELECT m FROM WorkspaceMember m JOIN FETCH m.workspace WHERE m.user = :user")
    List<WorkspaceMember> findAllByUserWithWorkspace(@Param("user") User user);

    Optional<WorkspaceMember> findByIdAndWorkspace(Long id, Workspace workspace);

    // Atomic role change: the owner row can never match; the count tells us if anything changed
    @Modifying
    @Query("UPDATE WorkspaceMember m SET m.role = :role WHERE m.id = :memberId AND m.workspace = :workspace AND m.role <> :owner")
    int updateNonOwnerRole(@Param("memberId") Long memberId, @Param("workspace") Workspace workspace,
                           @Param("role") WorkspaceRole role, @Param("owner") WorkspaceRole owner);

    // Atomic removals: the owner row can never match, and the count tells us if anything was deleted
    @Modifying
    @Query("DELETE FROM WorkspaceMember m WHERE m.id = :memberId AND m.workspace = :workspace AND m.role <> :owner")
    int deleteNonOwnerById(@Param("memberId") Long memberId, @Param("workspace") Workspace workspace,
                           @Param("owner") WorkspaceRole owner);

    @Modifying
    @Query("DELETE FROM WorkspaceMember m WHERE m.workspace = :workspace AND m.user = :user AND m.role <> :owner")
    int deleteNonOwnerMembership(@Param("workspace") Workspace workspace, @Param("user") User user,
                                 @Param("owner") WorkspaceRole owner);

    // Members of many workspaces in ONE query (user + workspace fetched, so no lazy hits in templates)
    @Query("SELECT m FROM WorkspaceMember m JOIN FETCH m.user JOIN FETCH m.workspace " +
            "WHERE m.workspace.id IN :workspaceIds ORDER BY m.createdAt ASC, m.id ASC")
    List<WorkspaceMember> findAllForWorkspaces(@Param("workspaceIds") List<Long> workspaceIds);


    // Adds a member unless one already exists for (workspace, user); an existing role is never changed.
    // Returns 1 if inserted, 0 if the user was already a member.
    @Modifying
    @Query(value = "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) " +
            "VALUES (:workspaceId, :userId, :role, :createdAt) ON CONFLICT (workspace_id, user_id) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@Param("workspaceId") Long workspaceId, @Param("userId") Long userId,
                       @Param("role") String role, @Param("createdAt") java.time.LocalDateTime createdAt);

    // The single lookup behind every access check: this user's membership in this workspace, if any
    @Query("SELECT m FROM WorkspaceMember m JOIN FETCH m.workspace " +
            "WHERE m.workspace.id = :workspaceId AND m.user = :user")
    Optional<WorkspaceMember> findMembership(@Param("workspaceId") Long workspaceId,
                                             @Param("user") User user);

    // Same lookup, starting from a note id: the user's membership in the workspace that note lives in
    @Query("SELECT m FROM WorkspaceMember m JOIN FETCH m.workspace w " +
            "WHERE m.user = :user AND w.id = (SELECT n.workspace.id FROM Note n WHERE n.id = :noteId)")
    Optional<WorkspaceMember> findMembershipForNote(@Param("noteId") Long noteId,
                                                    @Param("user") User user);

    // Same lookup, starting from a resource id (resource -> its note -> that note's workspace)
    @Query("SELECT m FROM WorkspaceMember m JOIN FETCH m.workspace w " +
            "WHERE m.user = :user AND w.id = (SELECT r.note.workspace.id FROM Resource r WHERE r.id = :resourceId)")
    Optional<WorkspaceMember> findMembershipForResource(@Param("resourceId") Long resourceId,
                                                        @Param("user") User user);
}


