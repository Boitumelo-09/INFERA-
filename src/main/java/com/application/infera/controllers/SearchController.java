package com.application.infera.controllers;

import com.application.infera.dtos.responses.SearchResultDTO;
import com.application.infera.models.User;
import com.application.infera.services.CurrentUserService;
import com.application.infera.services.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;
    private final CurrentUserService currentUserService;


    @GetMapping("/api/search")
    public List<SearchResultDTO> search(@RequestParam("q") String query, @AuthenticationPrincipal Object principal) {
        User user = currentUserService.resolve(principal);
        if (user == null) return List.of();
        return searchService.search(query, user);
    }


}