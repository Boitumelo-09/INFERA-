package com.application.infera.controllers;

import com.application.infera.models.Tag;
import com.application.infera.services.TagService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    // GET /api/tags/search?q=spr — returns tag names for autocomplete
    @GetMapping("/api/tags/search")
    public List<String> searchTags(@RequestParam("q") String query) {
        return tagService.searchTags(query)
                .stream()
                .map(Tag::getName)
                .collect(Collectors.toList());
    }
}