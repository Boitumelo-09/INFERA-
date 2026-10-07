package com.application.infera.repositories;

import com.application.infera.dtos.responses.DrawingSummaryResponse;
import com.application.infera.models.Drawing;
import com.application.infera.models.Note;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DrawingRepository extends JpaRepository<Drawing, Long> {

    // The whole ownership chain in ONE query: user -> workspace -> note -> drawing.
    // The noteId match also stops someone pairing their own noteId with another
    // note's drawingId.
    @Query("SELECT d FROM Drawing d WHERE d.id = :id AND d.note.id = :noteId AND d.note.workspace.user = :user")
    Optional<Drawing> findOwnedDrawing(@Param("id") Long id,
                                       @Param("noteId") Long noteId,
                                       @Param("user") User user);

    // Previews only — deliberately does NOT select sceneJson, which can be huge.
    @Query("SELECT new com.application.infera.dtos.responses.DrawingSummaryResponse(d.id, d.mode, d.previewSvg, d.updatedAt) " +
            "FROM Drawing d WHERE d.note = :note ORDER BY d.createdAt ASC")
    List<DrawingSummaryResponse> findSummariesByNote(@Param("note") Note note);

    // Used by NoteService.deleteNote to clear drawings before the note row goes
    List<Drawing> findByNote(Note note);

    List<Drawing> findDrawingByNote_Workspace(Workspace noteWorkspace);


    // ── Orphan housekeeping (see DrawingCleanupService) ──
    // Bulk statements on purpose: they skip @PreUpdate, so marking a drawing never bumps its
    // updatedAt (which the editor uses to decide when a preview changed).

    // IDs only: sceneJson / previewSvg can be huge and must not be loaded on every autosave
    @Query("SELECT d.id FROM Drawing d WHERE d.note.id = :noteId")
    List<Long> findIdsByNoteId(@Param("noteId") Long noteId);

    @Modifying
    @Query("UPDATE Drawing d SET d.orphanedAt = NULL WHERE d.note.id = :noteId AND d.id IN :ids AND d.orphanedAt IS NOT NULL")
    int clearOrphanMark(@Param("noteId") Long noteId, @Param("ids") Collection<Long> ids);

    @Modifying
    @Query("UPDATE Drawing d SET d.orphanedAt = :now WHERE d.note.id = :noteId AND d.id IN :ids AND d.orphanedAt IS NULL")
    int markOrphaned(@Param("noteId") Long noteId, @Param("ids") Collection<Long> ids, @Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM Drawing d WHERE d.note.id = :noteId AND d.id IN :ids AND d.orphanedAt < :cutoff")
    int deleteExpiredOrphans(@Param("noteId") Long noteId, @Param("ids") Collection<Long> ids, @Param("cutoff") LocalDateTime cutoff);
}