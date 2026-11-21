package com.application.infera.repositories;

import com.application.infera.dtos.responses.BinRow;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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
    @Query("SELECT w FROM Workspace w WHERE w.deletedAt IS NULL AND w.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user) " +
            "ORDER BY w.createdAt DESC")
    List<Workspace> findAccessibleByUser(@Param("user") User user);

    // Same set as findAccessibleByUser, but this user's favourites first (used by the workspaces page only)
    @Query("SELECT w FROM WorkspaceMember m JOIN m.workspace w WHERE m.user = :user AND w.deletedAt IS NULL " +
            "ORDER BY m.favorite DESC, w.createdAt DESC")
    List<Workspace> findAccessibleByUserFavoritesFirst(@Param("user") User user);

    @Query("SELECT COUNT(m) FROM WorkspaceMember m WHERE m.user = :user AND m.workspace.deletedAt IS NULL")
    long countAccessibleByUser(@Param("user") User user);

    // Includes the bin (settings' delete-account counts use it for now; revisited in step 6)
    long countByUser(User user);

    // The creation quota: a workspace in the bin doesn't count
    long countByUserAndDeletedAtIsNull(User user);

    // Check if a workspace name already exists for this user
    boolean existsByNameAndUser(String name, User user);


    // Workspaces this user owns that also have at least one OTHER member
    @Query("SELECT w FROM Workspace w WHERE w.user = :user AND w.deletedAt IS NULL AND EXISTS " +
            "(SELECT 1 FROM WorkspaceMember m WHERE m.workspace = w AND m.user <> :user)")
    List<Workspace> findOwnedSharedWorkspaces(@Param("user") User user);

    // Only this user's favourites, newest first
    @Query("SELECT w FROM WorkspaceMember m JOIN m.workspace w WHERE m.user = :user AND m.favorite = true AND w.deletedAt IS NULL " +
            "ORDER BY w.createdAt DESC")
    List<Workspace> findAccessibleByUserFavorites(@Param("user") User user);
    // Recycle bin: atomic. 0 rows = already in the bin.
    @Modifying
    @Query("UPDATE Workspace w SET w.deletedAt = :now, w.deletedBy = :user WHERE w.id = :id AND w.deletedAt IS NULL")
    int softDelete(@Param("id") Long id, @Param("user") User user,
                   @Param("now") java.time.LocalDateTime now);

    // GLOBAL BIN (workspaces): workspaces I own and deleted, not expired, newest first
    @Query("SELECT new com.application.infera.dtos.responses.BinRow(w.id, w.name, w.name, w.color, d.id, d.firstName, d.lastName, w.deletedAt) " +
            "FROM Workspace w LEFT JOIN w.deletedBy d " +
            "WHERE w.user = :user AND w.deletedBy = :user AND w.deletedAt IS NOT NULL AND w.deletedAt > :cutoff " +
            "ORDER BY w.deletedAt DESC")
    List<BinRow> findBinRowsDeletedByOwner(@Param("user") User user,
                                           @Param("cutoff") java.time.LocalDateTime cutoff);

    // Recycle bin restore: atomic, same shape as softDelete. 0 rows = not in the bin, or expired.
    // Children (notes, members, invitations) were never touched, so nothing else needs restoring.
    @Modifying
    @Query("UPDATE Workspace w SET w.deletedAt = NULL, w.deletedBy = NULL " +
            "WHERE w.id = :id AND w.deletedAt IS NOT NULL AND w.deletedAt > :cutoff")
    int restore(@Param("id") Long id, @Param("cutoff") java.time.LocalDateTime cutoff);

}
