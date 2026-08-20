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
    private final ProfileService profileService;

    public boolean updateTheme(User user, String theme) {
        if (!theme.equals("default") && !theme.equals("dark") && !theme.equals("light")) return false;
        user.setThemePreference(theme);
        userRepository.save(user);
        return true;
    }

    public record PasswordChangeResult(boolean success, String errorMessage) {
    }



    public void deleteUser(User user) {

        var notes = noteRepository.findByWorkspace_User(user);

        var resources = resourceRepository.findByNote_Workspace_UserOrderByCreatedAtDesc(user);
        resourceRepository.deleteAll(resources);
        for (var note : notes) note.getTags().clear();

        noteRepository.saveAll(notes);
        noteRepository.deleteAll(notes);
        activityRepository.deleteAll(activityRepository.findByUserOrderByCreatedAtDesc(user));
        workspaceRepository.deleteAll(workspaceRepository.findByUserOrderByCreatedAtDesc(user));
        profileService.deleteAvatar(user);
        userRepository.delete(user);

    }
}
