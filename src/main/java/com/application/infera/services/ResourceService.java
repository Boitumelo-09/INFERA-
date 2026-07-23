package com.application.infera.services;

import com.application.infera.dtos.requests.ResourceRequest;
import com.application.infera.enums.ResourceCategory;
import com.application.infera.exception.ResourceNotFoundException;
import com.application.infera.models.Note;
import com.application.infera.models.Resource;

import com.application.infera.models.User;
import com.application.infera.repositories.ResourceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final NoteService noteService;

    public ResourceService(ResourceRepository resourceRepository, NoteService noteService) {
        this.resourceRepository = resourceRepository;
        this.noteService = noteService;
    }

    // Create — note ownership is verified BEFORE the resource is built,
    // same principle as NoteService checking workspace ownership first
    public void createResource(ResourceRequest request, User user) {
        Note note = noteService.getNoteForUser(request.getNoteId(), user);

        Resource resource = new Resource();
        resource.setTitle(request.getTitle());
        resource.setUrl(request.getUrl());
        resource.setDescription(request.getDescription());
        resource.setCategory(ResourceCategory.valueOf(request.getCategory().toUpperCase()));
        resource.setNote(note);

        resourceRepository.save(resource);
    }

    // All resources for one note (used to populate the View Note modal)
    public List<Resource> getResourcesForNote(Long noteId, User user) {
        Note note = noteService.getNoteForUser(noteId, user);
        return resourceRepository.findByNoteOrderByCreatedAtDesc(note);
    }

    // Ownership-scoped single lookup, used before update/delete
    public Resource getResourceForUser(Long id, User user) {
        return resourceRepository.findByIdAndNote_Workspace_User(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
    }

    public void updateResource(Long id, ResourceRequest request, User user) {
        Resource resource = getResourceForUser(id, user);

        resource.setTitle(request.getTitle());
        resource.setUrl(request.getUrl());
        resource.setDescription(request.getDescription());
        resource.setCategory(ResourceCategory.valueOf(request.getCategory().toUpperCase()));

        resourceRepository.save(resource);
    }

    public void deleteResource(Long id, User user) {
        Resource resource = getResourceForUser(id, user);
        resourceRepository.delete(resource);
    }

    public long countResourcesForUser(User user) {
        return resourceRepository.countByNote_Workspace_User(user);
    }
    public Map<Long, List<Resource>> getResourcesGroupedByNote(User user) {
        List<Resource> resources = resourceRepository.findByNote_Workspace_UserOrderByCreatedAtDesc(user);
        return resources.stream().collect(Collectors.groupingBy(r -> r.getNote().getId()));
    }
}