package com.application.infera.repositories;

import com.application.infera.models.Note;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    // A note has no direct user_id — ownership is traced through workspace.user
    // Spring Data reads this as: WHERE workspace.user_id = ?
    List<Note> findByWorkspace_UserOrderByUpdatedAtDesc(User user);

    // Notes belonging to one specific workspace (already known to be owned by the user)
    List<Note> findByWorkspaceOrderByUpdatedAtDesc(Workspace workspace);

    // Ownership-scoped single lookup — prevents editing/deleting someone else's note
    Optional<Note> findByIdAndWorkspace_User(Long id, User user);

    // Total note count across all of a user's workspaces (for dashboard stat card)
    long countByWorkspace_User(User user);

    // Note count for ONE specific workspace — fine for a single lookup,
    // but calling this in a loop (once per workspace) means N separate
    // queries. Use countNotesGroupedByWorkspace below instead when
    // rendering a list of workspaces — it's ONE query for all of them.
    long countByWorkspace(Workspace workspace);

    // Efficient version: counts notes for EVERY workspace this user owns
    // in a single query. Returns rows shaped like [workspaceId, count].
    // Workspaces with ZERO notes won't appear in the results at all —
    // the service layer fills those in as 0.
    @Query("SELECT n.workspace.id, COUNT(n) FROM Note n WHERE n.workspace.user = :user GROUP BY n.workspace.id")
    List<Object[]> countNotesGroupedByWorkspace(@Param("user") User user);
}