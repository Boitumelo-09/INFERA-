package com.application.infera.services;

import com.application.infera.dtos.requests.NoteRequest;
import com.application.infera.dtos.requests.NoteUpdateRequest;
import com.application.infera.enums.ActivityType;
import com.application.infera.exception.NoteNotFoundException;
import com.application.infera.models.Note;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.repositories.NoteRepository;
import com.application.infera.repositories.ResourceRepository;
import org.springframework.stereotype.Service;
import com.application.infera.util.TiptapTextExtractor;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final WorkspaceService workspaceService;
    private final TagService tagService;
    private final ActivityService activityService;
    private final ResourceRepository resourceRepository;

    public NoteService(NoteRepository noteRepository, WorkspaceService workspaceService, TagService tagService, ActivityService activityService, ResourceRepository resourceRepository) {
        this.noteRepository = noteRepository;
        this.workspaceService = workspaceService;
        this.tagService = tagService;
        this.activityService = activityService;
        this.resourceRepository = resourceRepository;
    }

    // Create a note — the workspace ownership check happens BEFORE the note is ever built
    public Note createNote(NoteRequest request, User user) {
        // Throws WorkspaceNotFoundException if this workspace doesn't belong to the user —
        // stops someone from posting a note into a workspace that isn't theirs
        Workspace workspace = workspaceService.getWorkspaceForUser(request.getWorkspaceId(), user);

        Note note = new Note();
        note.setTitle(request.getTitle());
        note.setDocumentJson(request.getDocumentJson());
        note.setWorkspace(workspace);
        note.setTags(tagService.resolveTags(request.getTags(),user));
        syncPlainText(note);

        noteRepository.save(note);
        activityService.log(user, ActivityType.NOTE_CREATED, note.getTitle(), workspace);

        return note;
    }

    // All notes across every workspace this user owns
    public List<Note> getNotesForUser(User user) {
        return noteRepository.findByWorkspace_UserOrderByUpdatedAtDesc(user);
    }

    // Notes for ONE specific workspace — ownership is verified first via
    // WorkspaceService, THEN the notes are fetched. This two-step order
    // matters: never trust a workspaceId alone, always confirm it's the
    // user's before touching anything that belongs to it.
    public List<Note> getNotesForWorkspace(Long workspaceId, User user) {
        Workspace workspace = workspaceService.getWorkspaceForUser(workspaceId, user);
        return noteRepository.findByWorkspaceOrderByUpdatedAtDesc(workspace);
    }

    // Count for dashboard stat card
    public long countNotesForUser(User user) {
        return noteRepository.countByWorkspace_User(user);
    }

    // EFFICIENT version — one query gets note counts for ALL of the user's
    // workspaces at once. Returns a Map so the template can look up
    // noteCounts.get(ws.id) for each tile with zero extra database hits.
    public Map<Long, Long> getNoteCountsByWorkspace(User user) {
        List<Object[]> rows = noteRepository.countNotesGroupedByWorkspace(user);

        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : rows) {
            Long workspaceId = (Long) row[0];
            Long count       = (Long) row[1];
            counts.put(workspaceId, count);
        }
        return counts;   // workspaces with zero notes simply won't have an entry here
    }

    // Ownership-scoped single lookup, used before update/delete
    public Note getNoteForUser(Long id, User user) {
        return noteRepository.findByIdAndWorkspace_User(id, user)
                .orElseThrow(() -> new NoteNotFoundException("Note not found"));
    }

    // Update — re-verifies both the note AND the (possibly new) target workspace belong to the user
//

    public void deleteNote(Long id, User user) {
        Note note = getNoteForUser(id, user);
        String title = note.getTitle();
        Workspace ws = note.getWorkspace();

        resourceRepository.deleteAll(resourceRepository.findByNoteOrderByCreatedAtDesc(note));
        note.getTags().clear();
        noteRepository.save(note);
        noteRepository.delete(note);
        activityService.log(user, ActivityType.NOTE_DELETED, title, ws);
    }
    public Long countAllNotes(){
        return noteRepository.count();
    }

    // Logged once per editing "session" — see editor-api.js: fired when
    // the tab is hidden/navigated away from, and only if title or
    // documentJson actually differ from what was open at page load.
    // Deliberately NOT called from autosaveNote() itself, which would
    // spam one entry per debounce cycle.
    public void logEditActivity(Long id, User user) {
        Note note = getNoteForUser(id, user);
        activityService.log(user, ActivityType.NOTE_UPDATED, note.getTitle(), note.getWorkspace());
    }

    // Kept in sync every time documentJson changes (create + autosave).
    // Never called on its own — always right after setDocumentJson().
    private void syncPlainText(Note note) {
        note.setPlainText(TiptapTextExtractor.extract(note.getDocumentJson()));
    }
    public void touchNote(Note note) {
        note.setUpdatedAt(LocalDateTime.now());
        noteRepository.save(note);// @PreUpdate on Note bumps updatedAt automatically

    }

    // Autosave path — deliberately lighter than updateNote(): no activity
    // log (would spam the feed every debounce cycle), no workspace/tag
    // changes. Just title + documentJson, the two things the editor page
    // actually owns.
    public Note autosaveNote(Long id, NoteUpdateRequest request, User user) {
        Note note = getNoteForUser(id, user);

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            note.setTitle(request.getTitle());
        }
        note.setDocumentJson(request.getDocumentJson());
        syncPlainText(note);

        // Properties bar (item 3): workspace + tags now ride this same
        // autosave endpoint instead of the old form-post. A workspace
        // move is deliberate enough to still log — tag edits don't,
        // same reasoning as why plain content edits don't log here
        // (see item 5, still undecided).
        boolean workspaceChanged = false;
        if (request.getWorkspaceId() != null && !request.getWorkspaceId().equals(note.getWorkspace().getId())) {
            Workspace newWorkspace = workspaceService.getWorkspaceForUser(request.getWorkspaceId(), user);
            note.setWorkspace(newWorkspace);
            workspaceChanged = true;
        }
        if (request.getTags() != null) {
            note.setTags(tagService.resolveTags(request.getTags(), user));
        }

        noteRepository.save(note);
        if (workspaceChanged) {
            activityService.log(user, ActivityType.NOTE_UPDATED, note.getTitle(), note.getWorkspace());
        }
        return note;
    }
}