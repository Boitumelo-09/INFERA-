package com.application.infera.services;

import com.application.infera.enums.ActivityType;
import com.application.infera.models.Tag;
import com.application.infera.models.User;
import com.application.infera.repositories.TagRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository, ActivityService activityService) {
        this.tagRepository = tagRepository;
        this.activityService = activityService;
    }

    // Normalizes "#Spring" / " spring " / "SPRING" all down to "spring"
    private String normalize(String raw) {
        return raw.trim().toLowerCase().replaceFirst("^#", "");
    }

    // Reuses an existing tag by name, or creates it
    private final ActivityService activityService;

    public Tag findOrCreate(String rawName, com.application.infera.models.User user) {
        String name = normalize(rawName);
        return tagRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> {
                    Tag tag = new Tag();
                    tag.setName(name);
                    Tag saved = tagRepository.save(tag);
                    activityService.log(user, ActivityType.TAG_CREATED, name, null);
                    return saved;
                });
    }

    public Set<Tag> resolveTags(String rawCsv, User user) {
        if (rawCsv == null || rawCsv.isBlank()) return new HashSet<>();

        return Arrays.stream(rawCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(name -> findOrCreate(name, user))
                .collect(Collectors.toSet());
    }

    // Powers the autocomplete endpoint
    public List<Tag> searchTags(String query) {
        if (query == null || query.isBlank()) return List.of();
        return tagRepository.findTop10ByNameContainingIgnoreCaseOrderByNameAsc(normalize(query));
    }
    public long countTagsForUser(User user) {
        return tagRepository.countDistinctTagsForUser(user);
    }

}