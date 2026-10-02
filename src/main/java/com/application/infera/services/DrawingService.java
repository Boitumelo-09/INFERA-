package com.application.infera.services;

import com.application.infera.dtos.requests.DrawingSaveRequest;
import com.application.infera.dtos.responses.DrawingSummaryResponse;
import com.application.infera.enums.DrawingMode;
import com.application.infera.exception.DrawingNotFoundException;
import com.application.infera.exception.DrawingTooLargeException;
import com.application.infera.models.Drawing;
import com.application.infera.models.Note;
import com.application.infera.models.User;
import com.application.infera.repositories.DrawingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DrawingService {

    // Scenes with embedded images get big, so the cap is generous — it exists
    // to stop abuse, not to constrain normal drawings.
    private static final int MAX_SCENE_CHARS   = 10_000_000;
    private static final int MAX_PREVIEW_CHARS = 6_000_000;

    private final DrawingRepository drawingRepository;
    private final NoteService noteService;

    // Creates an empty drawing so the Tiptap node has a real id the moment it
    // is inserted. The note-ownership check happens first, inside
    // getNoteForUser (throws NoteNotFoundException if it isn't the user's).
    public Drawing createDrawing(Long noteId, DrawingMode mode, User user) {
        Note note = noteService.getNoteForUser(noteId, user);

        Drawing drawing = new Drawing();
        drawing.setNote(note);
        drawing.setMode(mode != null ? mode : DrawingMode.DRAWING);
        return drawingRepository.save(drawing);
    }

    // Same message whether the drawing doesn't exist or isn't the user's —
    // nothing to learn by probing ids.
    public Drawing getDrawingForUser(Long noteId, Long drawingId, User user) {
        return drawingRepository.findOwnedDrawing(drawingId, noteId, user)
                .orElseThrow(() -> new DrawingNotFoundException("Drawing not found"));
    }

    @Transactional(readOnly = true)
    public List<DrawingSummaryResponse> listSummaries(Long noteId, User user) {
        Note note = noteService.getNoteForUser(noteId, user);
        return drawingRepository.findSummariesByNote(note);
    }

    public Drawing saveDrawing(Long noteId, Long drawingId, DrawingSaveRequest request, User user) {
        Drawing drawing = getDrawingForUser(noteId, drawingId, user);

        if (request.getSceneJson() != null && request.getSceneJson().length() > MAX_SCENE_CHARS) {
            throw new DrawingTooLargeException("Drawing is too large to save");
        }
        if (request.getPreviewSvg() != null && request.getPreviewSvg().length() > MAX_PREVIEW_CHARS) {
            throw new DrawingTooLargeException("Drawing preview is too large to save");
        }

        if (request.getSceneJson() != null)  drawing.setSceneJson(request.getSceneJson());
        if (request.getPreviewSvg() != null) drawing.setPreviewSvg(request.getPreviewSvg());
        drawingRepository.save(drawing);

        // A drawing edit is a note edit: bump the note's updatedAt so it
        // sorts/dates correctly in the notes list.
        noteService.touchNote(drawing.getNote());
        return drawing;
    }
}