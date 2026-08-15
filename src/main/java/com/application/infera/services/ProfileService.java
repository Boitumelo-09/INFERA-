package com.application.infera.services;

import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;

    @Value("${app.upload-dir:uploads/avatars}")
    private String uploadDir;

    public void updateProfile(User user, String firstName, String lastName, String lifeRole, String location, String bio) {
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setLifeRole(lifeRole);
        user.setLocation(location);
        user.setBio(bio);
        userRepository.save(user);
    }

    public record AvatarUploadResult(boolean success, String message, String avatarUrl) {}

    public AvatarUploadResult uploadAvatar(User user, MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        boolean validType = contentType != null &&
                (contentType.equals("image/jpeg") || contentType.equals("image/png") || contentType.equals("image/webp"));
        if (!validType) return new AvatarUploadResult(false, "Only JPG, PNG, or WEBP allowed", null);
        if (file.getSize() > 3 * 1024 * 1024) return new AvatarUploadResult(false, "Max size is 3MB", null);

        deleteLocalAvatarFile(user);

        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);

        String ext = contentType.equals("image/png") ? "png" : contentType.equals("image/webp") ? "webp" : "jpg";
        String filename = user.getId() + "-" + UUID.randomUUID() + "." + ext;
        Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        user.setAvatarUrl("/uploads/avatars/" + filename);
        userRepository.save(user);

        return new AvatarUploadResult(true, null, user.getAvatarUrl());
    }
    public void deleteAvatar(User user) {
        deleteLocalAvatarFile(user);
        user.setAvatarUrl(null);
        userRepository.save(user);
    }

    // Only deletes files we actually own (local /uploads/avatars/ paths).
    // OAuth avatar URLs (Google/GitHub) are external and must never be touched here.
    private void deleteLocalAvatarFile(User user) {
        String url = user.getAvatarUrl();
        if (url == null || !url.startsWith("/uploads/avatars/")) return;
        try {
            Path path = Paths.get(uploadDir, Paths.get(url).getFileName().toString());
            Files.deleteIfExists(path);
        } catch (IOException ignored) {}
    }
}