package com.application.infera.services;

import com.application.infera.dtos.responses.SearchResultDTO;
import com.application.infera.models.*;
import com.application.infera.repositories.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SearchService {

    private final NoteRepository noteRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ResourceRepository resourceRepository;

    public SearchService(NoteRepository noteRepository, WorkspaceRepository workspaceRepository, ResourceRepository resourceRepository) {
        this.noteRepository = noteRepository;
        this.workspaceRepository = workspaceRepository;
        this.resourceRepository = resourceRepository;
    }

    public List<SearchResultDTO> search(String query, User user) {
        List<SearchResultDTO> results = new ArrayList<>();
        if (query == null || query.isBlank()) return results;

        // Search only inside workspaces this user belongs to (any role)
        List<Workspace> accessible = workspaceRepository.findAccessibleByUser(user);
        if (accessible.isEmpty()) return results;   // also avoids an empty IN (...) list

        String needle = query.toLowerCase();
        for (Workspace ws : accessible.stream()
                .filter(w -> w.getName().toLowerCase().contains(needle))
                .limit(5)
                .toList()) {
            results.add(new SearchResultDTO("workspace", ws.getId(), ws.getName(), "Workspace"));
        }

        for (Note note :noteRepository.findTop5ByWorkspaceInAndTitleContainingIgnoreCaseOrWorkspaceInAndPlainTextContainingIgnoreCase(accessible, query, accessible, query)) {
            results.add(new SearchResultDTO("note", note.getId(), note.getTitle(), note.getWorkspace().getName()));
        }

        for (Resource res :resourceRepository.findTop5ByNote_WorkspaceInAndTitleContainingIgnoreCase(accessible, query)) {
            results.add(new SearchResultDTO("resource", res.getNote().getId(), res.getTitle(), res.getCategory().name()));
        }

        return results;
    }
}