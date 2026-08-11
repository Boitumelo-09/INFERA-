package com.application.infera.services;

import com.application.infera.dtos.requests.ResourceRequest;
import com.application.infera.enums.ActivityType;
import com.application.infera.enums.ResourceCategory;
import com.application.infera.exception.ResourceNotFoundException;
import com.application.infera.models.Note;
import com.application.infera.models.Resource;

import com.application.infera.models.User;
import com.application.infera.repositories.ResourceRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final NoteService noteService;
    private final ActivityService activityService;

    public ResourceService(ResourceRepository resourceRepository, NoteService noteService, ActivityService activityService) {
        this.resourceRepository = resourceRepository;
        this.noteService = noteService;
        this.activityService = activityService;
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
        noteService.touchNote(note);
        activityService.log(user, ActivityType.RESOURCE_ADDED, resource.getTitle(), note.getWorkspace());

    }


    public Map<Long, Long> getResourceCountsByWorkspace(User user) {
        List<Object[]> rows = resourceRepository.countResourcesGroupedByWorkspace(user);
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : rows) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
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
        noteService.touchNote(resource.getNote());
        activityService.log(user, ActivityType.RESOURCE_UPDATED, resource.getTitle(), resource.getNote().getWorkspace());
    }

    public void deleteResource(Long id, User user) {
        Resource resource = getResourceForUser(id, user);
        Note note = resource.getNote();
        resourceRepository.delete(resource);
        noteService.touchNote(note);
        activityService.log(user, ActivityType.RESOURCE_DELETED, resource.getTitle(), note.getWorkspace());
    }


    public long countResourcesForUser(User user) {
        return resourceRepository.countByNote_Workspace_User(user);
    }

    public Map<Long, List<Resource>> getResourcesGroupedByNote(User user) {
        List<Resource> resources = resourceRepository.findByNote_Workspace_UserOrderByCreatedAtDesc(user);
        return resources.stream().collect(Collectors.groupingBy(r -> r.getNote().getId()));
    }

    public Map<ResourceCategory, List<Resource>> getResourcesGroupedByCategory(User user) {
        List<Resource> resources = resourceRepository.findByNote_Workspace_UserOrderByUpdatedAtDesc(user);
        Map<ResourceCategory, List<Resource>> grouped = new EnumMap<>(ResourceCategory.class);
        for (ResourceCategory cat : ResourceCategory.values()) {
            grouped.put(cat, new ArrayList<>());
        }
        for (Resource r : resources) {
            grouped.get(r.getCategory()).add(r);
        }
        return grouped;
    }
}