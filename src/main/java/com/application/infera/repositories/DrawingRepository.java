package com.application.infera.repositories;

import com.application.infera.dtos.responses.DrawingSummaryResponse;
import com.application.infera.models.Drawing;
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
}