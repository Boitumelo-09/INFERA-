package com.application.infera.services;

import com.application.infera.enums.ActivityType;
import com.application.infera.models.Tag;
import com.application.infera.models.User;
import com.application.infera.repositories.TagRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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
        Optional<Tag> existing = tagRepository.findByNameIgnoreCase(name);
        if (existing.isPresent()) return existing.get();

        // Not found: insert race-safely, then read back whichever row won
        boolean created = tagRepository.insertIfAbsent(name, LocalDateTime.now()) == 1;
        Tag tag = tagRepository.findByNameIgnoreCase(name)
                .orElseThrow(() -> new IllegalStateException("Tag could not be created: " + name));
        if (created) activityService.log(user, ActivityType.TAG_CREATED, name, null); // only the request that created it logs it
        return tag;
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
    public List<Tag> searchTags(String query, User user) {
        if (query == null || query.isBlank()) return List.of();
        String needle = normalize(query);
        // Only tags on notes in workspaces this user belongs to; names are stored normalized (lowercase)
        return tagRepository.findAccessibleByUser(user).stream()
                .filter(t -> t.getName().contains(needle))
                .sorted(Comparator.comparing(Tag::getName))
                .limit(10)
                .toList();
    }

    public long countTagsForUser(User user) {
        return tagRepository.countDistinctTagsForUser(user);
    }

}