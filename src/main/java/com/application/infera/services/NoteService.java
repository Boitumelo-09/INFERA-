package com.application.infera.services;

import com.application.infera.dtos.requests.NoteRequest;
import com.application.infera.exception.NoteNotFoundException;
import com.application.infera.models.Note;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.repositories.NoteRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final WorkspaceService workspaceService;

    public NoteService(NoteRepository noteRepository, WorkspaceService workspaceService) {
        this.noteRepository = noteRepository;
        this.workspaceService = workspaceService;
    }

    // Create a note — the workspace ownership check happens BEFORE the note is ever built
    public void createNote(NoteRequest request, User user) {
        // Throws WorkspaceNotFoundException if this workspace doesn't belong to the user —
        // stops someone from posting a note into a workspace that isn't theirs
        Workspace workspace = workspaceService.getWorkspaceForUser(request.getWorkspaceId(), user);

        Note note = new Note();
        note.setTitle(request.getTitle());
        note.setContent(request.getContent());
        note.setWorkspace(workspace);

        noteRepository.save(note);
    }

    // All notes across every workspace this user owns
    public List<Note> getNotesForUser(User user) {
        return noteRepository.findByWorkspace_UserOrderByUpdatedAtDesc(user);
    }

    // Count for dashboard stat card
    public long countNotesForUser(User user) {
        return noteRepository.countByWorkspace_User(user);
    }

    // Ownership-scoped single lookup, used before update/delete
    public Note getNoteForUser(Long id, User user) {
        return noteRepository.findByIdAndWorkspace_User(id, user)
                .orElseThrow(() -> new NoteNotFoundException("Note not found"));
    }

    // Update — re-verifies both the note AND the (possibly new) target workspace belong to the user
    public void updateNote(Long id, NoteRequest request, User user) {
        Note note = getNoteForUser(id, user);

        // If the user is moving the note to a different workspace, confirm they own that one too
        if (!note.getWorkspace().getId().equals(request.getWorkspaceId())) {
            Workspace newWorkspace = workspaceService.getWorkspaceForUser(request.getWorkspaceId(), user);
            note.setWorkspace(newWorkspace);
        }

        note.setTitle(request.getTitle());
        note.setContent(request.getContent());

        noteRepository.save(note);
    }

    // Delete — ownership confirmed via getNoteForUser before anything is removed
    public void deleteNote(Long id, User user) {
        Note note = getNoteForUser(id, user);
        noteRepository.delete(note);
    }
}