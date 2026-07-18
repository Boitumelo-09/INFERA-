package com.application.infera.services;

import com.application.infera.models.Tag;
import com.application.infera.repositories.TagRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    // Normalizes "#Spring" / " spring " / "SPRING" all down to "spring"
    private String normalize(String raw) {
        return raw.trim().toLowerCase().replaceFirst("^#", "");
    }

    // Reuses an existing tag by name, or creates it
    public Tag findOrCreate(String rawName) {
        String name = normalize(rawName);
        return tagRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> {
                    Tag tag = new Tag();
                    tag.setName(name);
                    return tagRepository.save(tag);
                });
    }

    // Parses a raw comma-separated string ("spring, jpa, #security") into a Set<Tag>,
    // deduplicated and blank-filtered
    public Set<Tag> resolveTags(String rawCsv) {
        if (rawCsv == null || rawCsv.isBlank()) return new HashSet<>();

        return Arrays.stream(rawCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(this::findOrCreate)
                .collect(Collectors.toSet());
    }

    // Powers the autocomplete endpoint
    public List<Tag> searchTags(String query) {
        if (query == null || query.isBlank()) return List.of();
        return tagRepository.findTop10ByNameContainingIgnoreCaseOrderByNameAsc(normalize(query));
    }
}