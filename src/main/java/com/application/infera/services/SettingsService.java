package com.application.infera.services;

import com.application.infera.models.User;
import com.application.infera.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SettingsService {
    private final NoteRepository noteRepository;
    private final ResourceRepository resourceRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final PasswordEncoder passwordEncoder;

    public boolean updateTheme(User user, String theme) {
        if (!theme.equals("default") && !theme.equals("dark") && !theme.equals("light")) return false;
        user.setThemePreference(theme);
        userRepository.save(user);
        return true;
    }

    public record PasswordChangeResult(boolean success, String errorMessage) {
    }

    public PasswordChangeResult changePassword(User user, String currentPassword, String newPassword, String confirmPassword) {
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return new PasswordChangeResult(false, "Current password is incorrect");
        }
        if (!newPassword.equals(confirmPassword)) {
            return new PasswordChangeResult(false, "New passwords don't match");
        }
        if (newPassword.length() < 8) {
            return new PasswordChangeResult(false, "Password must be at least 8 characters");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return new PasswordChangeResult(true, null);
    }

    public void deleteUser(User user) {

        var notes = noteRepository.findByWorkspace_User(user);

        var resources = resourceRepository.findByNote_Workspace_UserOrderByCreatedAtDesc(user);
        resourceRepository.deleteAll(resources);
        for (var note : notes)
            note.getTags().clear(); // clears note_tags join rows, tags themselves are shared/global and stay
        noteRepository.saveAll(notes);
        noteRepository.deleteAll(notes);
        activityRepository.deleteAll(activityRepository.findByUserOrderByCreatedAtDesc(user));
        workspaceRepository.deleteAll(workspaceRepository.findByUserOrderByCreatedAtDesc(user));
        userRepository.delete(user);

    }
}
