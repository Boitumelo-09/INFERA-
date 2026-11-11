package com.application.infera.services;

import com.application.infera.exception.AccountDeletionBlockedException;
import com.application.infera.models.User;
import com.application.infera.repositories.*;
import lombok.RequiredArgsConstructor;
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
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final DrawingService drawingService;
    private final InvitationRepository invitationRepository;

    public boolean updateTheme(User user, String theme) {
        if (!theme.equals("default") && !theme.equals("dark") && !theme.equals("light")) return false;
        user.setThemePreference(theme);
        userRepository.save(user);
        return true;
    }

  @Transactional
    public void deleteUser(User user) {

      var shared = workspaceRepository.findOwnedSharedWorkspaces(user);
      if (!shared.isEmpty()) {
          throw new AccountDeletionBlockedException(shared.stream().map(w -> w.getName()).toList());
      }

      var notes = noteRepository.findByWorkspace_User(user);

        var resources = resourceRepository.findByNote_Workspace_UserOrderByCreatedAtDesc(user);
        resourceRepository.deleteAll(resources);
        for (var note : notes) note.getTags().clear();
        
        drawingService.deleteAllDrawings(user);
        noteRepository.saveAll(notes);
        noteRepository.deleteAll(notes);
      activityRepository.deleteAll(activityRepository.findByUserOrderByCreatedAtDesc(user));
      // Activity rows from OTHER users (e.g. former members) that still point at this user's workspaces
      for (var ws : workspaceRepository.findByUserOrderByCreatedAtDesc(user)) {
          activityRepository.deleteAll(activityRepository.findByWorkspace(ws));
          invitationRepository.deleteByWorkspace(ws);
      }
      invitationRepository.deleteByEmail(user.getEmail());   // invitations addressed to this person
      workspaceMemberRepository.deleteAll(workspaceMemberRepository.findByUser(user));
      workspaceRepository.deleteAll(workspaceRepository.findByUserOrderByCreatedAtDesc(user));
      profileService.deleteAvatar(user);
        todoService.deleteAll(user);
        userRepository.delete(user);

    }
    public long countOwnedWorkspaces(User user) { return workspaceRepository.countByUser(user); }
    public long countOwnedNotes(User user) { return noteRepository.countByWorkspace_User(user); }
    public long countOwnedResources(User user) { return resourceRepository.countByNote_Workspace_User(user); }
}
