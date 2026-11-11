package com.application.infera.repositories;

import com.application.infera.models.Invitation;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    @Query("SELECT i FROM Invitation i JOIN FETCH i.workspace JOIN FETCH i.invitedBy WHERE i.tokenHash = :hash")
    Optional<Invitation> findWithDetailsByTokenHash(@Param("hash") String hash);

    @Query("SELECT i FROM Invitation i JOIN FETCH i.workspace JOIN FETCH i.invitedBy WHERE i.id = :id")
    Optional<Invitation> findWithDetailsById(@Param("id") Long id);

    // "Pending" = not accepted, revoked or declined, and not expired
    @Query("SELECT COUNT(i) FROM Invitation i WHERE i.workspace = :workspace AND i.acceptedAt IS NULL " +
            "AND i.revokedAt IS NULL AND i.declinedAt IS NULL AND i.expiresAt > :now")
    long countPending(@Param("workspace") Workspace workspace, @Param("now") LocalDateTime now);

    @Query("SELECT i FROM Invitation i WHERE i.workspace = :workspace AND i.acceptedAt IS NULL " +
            "AND i.revokedAt IS NULL AND i.declinedAt IS NULL AND i.expiresAt > :now ORDER BY i.createdAt DESC")
    List<Invitation> findPendingByWorkspace(@Param("workspace") Workspace workspace, @Param("now") LocalDateTime now);

    // The in-app "notification" list for a registered user
    @Query("SELECT i FROM Invitation i JOIN FETCH i.workspace JOIN FETCH i.invitedBy WHERE i.email = :email " +
            "AND i.acceptedAt IS NULL AND i.revokedAt IS NULL AND i.declinedAt IS NULL AND i.expiresAt > :now " +
            "ORDER BY i.createdAt DESC")
    List<Invitation> findPendingByEmail(@Param("email") String email, @Param("now") LocalDateTime now);

    // Re-invite: closes any open row (including expired-but-unrevoked) so the one-open index allows a new one
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Invitation i SET i.revokedAt = :now WHERE i.workspace = :workspace AND i.email = :email " +
            "AND i.acceptedAt IS NULL AND i.revokedAt IS NULL AND i.declinedAt IS NULL")
    int revokeOpen(@Param("workspace") Workspace workspace, @Param("email") String email, @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Invitation i SET i.revokedAt = :now WHERE i.id = :id AND i.workspace = :workspace " +
            "AND i.acceptedAt IS NULL AND i.revokedAt IS NULL AND i.declinedAt IS NULL")
    int revokeOpenById(@Param("id") Long id, @Param("workspace") Workspace workspace, @Param("now") LocalDateTime now);

    // THE atomic step: every rule is inside one UPDATE, so two simultaneous accepts cannot both match.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Invitation i SET i.acceptedAt = :now, i.acceptedBy = :user WHERE i.id = :id " +
            "AND i.email = :email AND i.acceptedAt IS NULL AND i.revokedAt IS NULL " +
            "AND i.declinedAt IS NULL AND i.expiresAt > :now")
    int markAccepted(@Param("id") Long id, @Param("user") User user,
                     @Param("email") String email, @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Invitation i SET i.declinedAt = :now WHERE i.id = :id AND i.email = :email " +
            "AND i.acceptedAt IS NULL AND i.revokedAt IS NULL AND i.declinedAt IS NULL AND i.expiresAt > :now")
    int markDeclined(@Param("id") Long id, @Param("email") String email, @Param("now") LocalDateTime now);

    // Bulk deletes: callers (deleteWorkspace, deleteUser) are @Transactional
    @Modifying
    @Query("DELETE FROM Invitation i WHERE i.workspace = :workspace")
    int deleteByWorkspace(@Param("workspace") Workspace workspace);

    @Modifying
    @Query("DELETE FROM Invitation i WHERE i.email = :email")
    int deleteByEmail(@Param("email") String email);
}