package com.application.infera.controllers;

import com.application.infera.models.Tag;
import com.application.infera.models.User;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.TagService;
import lombok.AllArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@AllArgsConstructor
public class TagController {

    private final TagService tagService;
    private final CurrentUserService currentUserService;

    // GET /api/tags/search?q=spr — returns tag names for autocomplete
    @GetMapping("/api/tags/search")
    public List<String> searchTags(@RequestParam("q") String query,
                                   @AuthenticationPrincipal Object principal) {
        User user = currentUserService.resolve(principal);
        if (user == null) return List.of();   // same as SearchController when the user can't be resolved
        return tagService.searchTags(query, user)
                .stream()
                .map(Tag::getName)
                .collect(Collectors.toList());
    }
}