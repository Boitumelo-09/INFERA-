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

        for (Workspace ws : workspaceRepository.findTop5ByUserAndNameContainingIgnoreCase(user, query)) {
            results.add(new SearchResultDTO("workspace", ws.getId(), ws.getName(), "Workspace"));
        }

        for (Note note : noteRepository.findTop5ByWorkspace_UserAndTitleContainingIgnoreCaseOrWorkspace_UserAndDocumentJsonContainingIgnoreCase(user, query, user, query)) {
            results.add(new SearchResultDTO("note", note.getId(), note.getTitle(), note.getWorkspace().getName()));
        }

        for (Resource res : resourceRepository.findTop5ByNote_Workspace_UserAndTitleContainingIgnoreCase(user, query)) {
            results.add(new SearchResultDTO("resource", res.getNote().getId(), res.getTitle(), res.getCategory().name()));
        }

        return results;
    }
}