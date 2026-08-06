package com.application.infera.controllers;

import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.CustomUserDetails;
import com.application.infera.services.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@Controller
@RequestMapping("/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final WorkspaceService workspaceService;
    private final NoteService noteService;
    private final ResourceService resourceService;

    @Value("${app.upload-dir:uploads/avatars}")
    private String uploadDir;

    @GetMapping
    public String profilePage(@AuthenticationPrincipal Object principal, Model model) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        model.addAttribute("user", user);
        model.addAttribute("pageTitle", "Profile — INFERA");
        model.addAttribute("workspaceCount", workspaceService.countWorkspacesForUser(user));
        model.addAttribute("noteCount", noteService.countNotesForUser(user));
        model.addAttribute("resourceCount", resourceService.countResourcesForUser(user));
        return "profile";
    }

    @PostMapping("/update")
   
    public String updateProfile(@AuthenticationPrincipal Object principal,
                                @RequestParam("firstName") String firstName,
                                @RequestParam("lastName") String lastName,
                                @RequestParam(value = "lifeRole", required = false) String lifeRole,
                                @RequestParam(value = "location", required = false) String location,
                                @RequestParam(value = "bio", required = false) String bio,
                                RedirectAttributes redirectAttributes)  {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setLifeRole(lifeRole);
        user.setLocation(location);
        user.setBio(bio);
        userRepository.save(user);
        redirectAttributes.addFlashAttribute("toast", "Profile updated");
        return "redirect:/profile";
    }

    @PostMapping("/avatar")
    @ResponseBody
    public Map<String, Object> uploadAvatar(@AuthenticationPrincipal Object principal,
                                            @RequestParam("file") MultipartFile file) throws IOException {
        User user = resolveUser(principal);
        if (user == null) return Map.of("success", false, "message", "Not authenticated");

        String contentType = file.getContentType();
        boolean validType = contentType != null &&
                (contentType.equals("image/jpeg") || contentType.equals("image/png") || contentType.equals("image/webp"));
        if (!validType) return Map.of("success", false, "message", "Only JPG, PNG, or WEBP allowed");
        if (file.getSize() > 3 * 1024 * 1024) return Map.of("success", false, "message", "Max size is 3MB");

        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);

        String ext = contentType.equals("image/png") ? "png" : contentType.equals("image/webp") ? "webp" : "jpg";
        String filename = user.getId() + "-" + UUID.randomUUID() + "." + ext;
        Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        user.setAvatarUrl("/uploads/avatars/" + filename);
        userRepository.save(user);

        return Map.of("success", true, "avatarUrl", user.getAvatarUrl());
    }

    // same pattern as DashboardController
    private User resolveUser(Object principal) {
        if (principal instanceof CustomUserDetails userDetails) {
            return userRepository.findById(userDetails.getUser().getId()).orElse(null);
        }
        if (principal instanceof OAuth2User oAuth2User) {
            String email = oAuth2User.getAttribute("email");
            return email == null ? null : userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}