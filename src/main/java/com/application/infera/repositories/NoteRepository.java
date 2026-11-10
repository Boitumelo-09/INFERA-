package com.application.infera.repositories;

import com.application.infera.models.Note;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {



    // Notes belonging to one specific workspace (already known to be owned by the user)
    List<Note> findByWorkspaceOrderByUpdatedAtDesc(Workspace workspace);


    // Used only AFTER membership is verified (see WorkspaceAccessService.requireNote)
    Optional<Note> findByIdAndWorkspace(Long id, Workspace workspace);






    List<Note> findByWorkspace_User(User user);   // notes in workspaces this user OWNS: account deletion only

    // ── Member-based reads: every note in a workspace this user belongs to (any role) ──
    @Query("SELECT n FROM Note n WHERE n.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user) " +
            "ORDER BY n.updatedAt DESC")
    List<Note> findAccessibleByUser(@Param("user") User user);

    @Query("SELECT COUNT(n) FROM Note n WHERE n.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user)")
    long countAccessibleByUser(@Param("user") User user);

    @Query("SELECT n.workspace.id, COUNT(n) FROM Note n WHERE n.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user) " +
            "GROUP BY n.workspace.id")
    List<Object[]> countAccessibleGroupedByWorkspace(@Param("user") User user);

    // Search inside the given workspaces. The caller passes the user's accessible workspaces
    // and must not call this with an empty collection.
    List<Note> findTop5ByWorkspaceInAndTitleContainingIgnoreCaseOrWorkspaceInAndPlainTextContainingIgnoreCase(
            Collection<Workspace> workspaces1, String titleQuery,
            Collection<Workspace> workspaces2, String contentQuery);

}