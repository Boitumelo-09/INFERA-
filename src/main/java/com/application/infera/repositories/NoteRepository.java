package com.application.infera.repositories;

import com.application.infera.models.Note;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {



    // ALL notes of a workspace, bin included. Only for hard deletes (deleteWorkspace / purge); screens use the variant below
    List<Note> findByWorkspaceOrderByUpdatedAtDesc(Workspace workspace);

    // What screens show: notes of one workspace that are not in the bin
    List<Note> findByWorkspaceAndDeletedAtIsNullOrderByUpdatedAtDesc(Workspace workspace);


    // Used only AFTER membership is verified (see WorkspaceAccessService.requireNote)
    // Includes the bin: step 3's restore will need it
    Optional<Note> findByIdAndWorkspace(Long id, Workspace workspace);

    // The normal access gate: a note in the bin is "not found"
    Optional<Note> findByIdAndWorkspaceAndDeletedAtIsNull(Long id, Workspace workspace);


    List<Note> findByWorkspace_User(User user);   // notes in workspaces this user OWNS: account deletion only

    // ── Member-based reads: every note in a workspace this user belongs to (any role) ──
    // Live notes only: not in the bin, and not inside a workspace that is in the bin
    @Query("SELECT n FROM Note n WHERE n.deletedAt IS NULL AND n.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user AND m.workspace.deletedAt IS NULL) " +
            "ORDER BY n.updatedAt DESC")
    List<Note> findAccessibleByUser(@Param("user") User user);

    @Query("SELECT COUNT(n) FROM Note n WHERE n.deletedAt IS NULL AND n.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user AND m.workspace.deletedAt IS NULL)")
    long countAccessibleByUser(@Param("user") User user);

    @Query("SELECT n.workspace.id, COUNT(n) FROM Note n WHERE n.deletedAt IS NULL AND n.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user AND m.workspace.deletedAt IS NULL) " +
            "GROUP BY n.workspace.id")
    List<Object[]> countAccessibleGroupedByWorkspace(@Param("user") User user);

    // Search inside the given workspaces. The caller passes the user's accessible workspaces
    // and must not call this with an empty collection.
    List<Note> findTop5ByWorkspaceInAndDeletedAtIsNullAndTitleContainingIgnoreCaseOrWorkspaceInAndDeletedAtIsNullAndPlainTextContainingIgnoreCase(
            Collection<Workspace> workspaces1, String titleQuery,
            Collection<Workspace> workspaces2, String contentQuery);

    long countByWorkspace_User(User user);
    // Recycle bin: atomic. Bumps the version on purpose so an in-flight autosave of the same note
    // fails with a conflict instead of writing deleted_at back to NULL. 0 rows = already in the bin.
    @Modifying
    @Query("UPDATE Note n SET n.deletedAt = :now, n.deletedBy = :user, n.version = n.version + 1 " +
            "WHERE n.id = :id AND n.deletedAt IS NULL")
    int softDelete(@Param("id") Long id, @Param("user") User user,
                   @Param("now") java.time.LocalDateTime now);

    // Recycle bin restore: atomic. Only a note that is in the bin AND not expired matches, so a second click,
    // a concurrent restore, or an expiry between the gate and this UPDATE returns 0 rows.
    // Bumps the version so a tab still holding the pre-delete version can't autosave over the restored note.
    @Modifying
    @Query("UPDATE Note n SET n.deletedAt = NULL, n.deletedBy = NULL, n.version = n.version + 1 " +
            "WHERE n.id = :id AND n.deletedAt IS NOT NULL AND n.deletedAt > :cutoff")
    int restore(@Param("id") Long id, @Param("cutoff") java.time.LocalDateTime cutoff);

    // Bulk UPDATE: changes only updated_at and leaves the version alone (see NoteService.touchNote)    @Modifying
    @Query("UPDATE Note n SET n.updatedAt = :now WHERE n.id = :id")
    int touch(@Param("id") Long id, @Param("now") java.time.LocalDateTime now);
}