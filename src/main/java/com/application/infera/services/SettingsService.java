package com.application.infera.services;

import com.application.infera.models.User;
import com.application.infera.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SettingsService {
    private final NoteRepository noteRepository;
    private final ResourceRepository resourceRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final ProfileService profileService;
    private final TodoService todoService;
    private final DrawingService drawingService;

    public boolean updateTheme(User user, String theme) {
        if (!theme.equals("default") && !theme.equals("dark") && !theme.equals("light")) return false;
        user.setThemePreference(theme);
        userRepository.save(user);
        return true;
    }

  @Transactional
    public void deleteUser(User user) {

        var notes = noteRepository.findByWorkspace_User(user);

        var resources = resourceRepository.findByNote_Workspace_UserOrderByCreatedAtDesc(user);
        resourceRepository.deleteAll(resources);
        for (var note : notes) note.getTags().clear();
        
        drawingService.deleteAllDrawings(user);
        noteRepository.saveAll(notes);
        noteRepository.deleteAll(notes);
        activityRepository.deleteAll(activityRepository.findByUserOrderByCreatedAtDesc(user));
        workspaceRepository.deleteAll(workspaceRepository.findByUserOrderByCreatedAtDesc(user));
        profileService.deleteAvatar(user);
        todoService.deleteAll(user);
        userRepository.delete(user);

    }
}
