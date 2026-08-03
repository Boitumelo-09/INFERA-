package com.application.infera.controllers;

import com.application.infera.dtos.responses.SearchResultDTO;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.CustomUserDetails;
import com.application.infera.services.SearchService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class SearchController {

    private final SearchService searchService;
    private final UserRepository userRepository;

    public SearchController(SearchService searchService, UserRepository userRepository) {
        this.searchService = searchService;
        this.userRepository = userRepository;
    }

    @GetMapping("/api/search")
    public List<SearchResultDTO> search(@RequestParam("q") String query, @AuthenticationPrincipal Object principal) {
        User user = resolveUser(principal);
        if (user == null) return List.of();
        return searchService.search(query, user);
    }

    private User resolveUser(Object principal) {
        if (principal instanceof CustomUserDetails ud) return ud.getUser();
        if (principal instanceof OAuth2User ou) {
            String email = ou.getAttribute("email");
            return email == null ? null : userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}