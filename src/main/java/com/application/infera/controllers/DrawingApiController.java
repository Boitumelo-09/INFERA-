package com.application.infera.controllers;

import com.application.infera.dtos.requests.DrawingCreateRequest;
import com.application.infera.dtos.requests.DrawingSaveRequest;
import com.application.infera.dtos.responses.DrawingResponse;
import com.application.infera.exception.DrawingNotFoundException;
import com.application.infera.exception.DrawingTooLargeException;
import com.application.infera.exception.NoteNotFoundException;
import com.application.infera.models.Drawing;
import com.application.infera.models.User;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.DrawingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/* Every endpoint resolves the user first, then hands (noteId, drawingId, user)
   to the service, which enforces ownership. Ids from the URL are never trusted
   on their own. */
@RestController
@RequestMapping("/api/notes/{noteId}/drawings")
@RequiredArgsConstructor
public class DrawingApiController {

    private final DrawingService drawingService;
    private final CurrentUserService currentUserService;

    // POST /api/notes/{noteId}/drawings — create an empty drawing, return its id
    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal Object principal,
                                    @PathVariable Long noteId,
                                    @RequestBody(required = false) DrawingCreateRequest request) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            Drawing drawing = drawingService.createDrawing(noteId, request != null ? request.getMode() : null, user);
            return ResponseEntity.status(HttpStatus.CREATED).body(DrawingResponse.from(drawing));
        } catch (NoteNotFoundException e) {
            return notFound(e.getMessage());
        }
    }

    // GET /api/notes/{noteId}/drawings — previews only (no scene data)
    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal Object principal,
                                  @PathVariable Long noteId) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            return ResponseEntity.ok(drawingService.listSummaries(noteId, user));
        } catch (NoteNotFoundException e) {
            return notFound(e.getMessage());
        }
    }

    // GET /api/notes/{noteId}/drawings/{drawingId} — full drawing incl. scene
    @GetMapping("/{drawingId}")
    public ResponseEntity<?> get(@AuthenticationPrincipal Object principal,
                                 @PathVariable Long noteId,
                                 @PathVariable Long drawingId) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            Drawing drawing = drawingService.getDrawingForUser(noteId, drawingId, user);
            return ResponseEntity.ok(DrawingResponse.from(drawing));
        } catch (DrawingNotFoundException e) {
            return notFound(e.getMessage());
        }
    }

    // PUT /api/notes/{noteId}/drawings/{drawingId} — save scene + preview
    @PutMapping("/{drawingId}")
    public ResponseEntity<?> save(@AuthenticationPrincipal Object principal,
                                  @PathVariable Long noteId,
                                  @PathVariable Long drawingId,
                                  @RequestBody DrawingSaveRequest request) {
        User user = currentUserService.resolve(principal);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            Drawing drawing = drawingService.saveDrawing(noteId, drawingId, request, user);
            return ResponseEntity.ok(new SaveResponse(drawing.getUpdatedAt()));
        } catch (DrawingNotFoundException e) {
            return notFound(e.getMessage());
        } catch (DrawingTooLargeException e) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(e.getMessage());
        }
    }

    private ResponseEntity<String> notFound(String message) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(message);
    }

    public record SaveResponse(LocalDateTime updatedAt) {}
}