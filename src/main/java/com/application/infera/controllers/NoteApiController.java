package com.application.infera.controllers;

import com.application.infera.dtos.requests.NoteUpdateRequest;
import com.application.infera.exception.NoteNotFoundException;
import com.application.infera.models.Note;
import com.application.infera.models.User;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.NoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteApiController {

    private final NoteService noteService;
    private final CurrentUserService currentUserService;

    // PUT /api/notes/{id} — autosave target for the Tiptap editor page.
    // Only touches title + documentJson. Workspace/tag reassignment is
    // still the separate form-post flow for now.
    @PutMapping("/{id}")
    public ResponseEntity<?> autosaveNote(@AuthenticationPrincipal Object principal,
                                          @PathVariable Long id,
                                          @RequestBody NoteUpdateRequest request) {
        User user = currentUserService.resolve(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            Note note = noteService.autosaveNote(id, request, user);
            return ResponseEntity.ok(new AutosaveResponse(note.getUpdatedAt()));
        } catch (NoteNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    public record AutosaveResponse(LocalDateTime updatedAt) {}
}