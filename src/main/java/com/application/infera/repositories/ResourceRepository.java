package com.application.infera.repositories;

import com.application.infera.models.Note;
import com.application.infera.models.Resource;
import com.application.infera.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByNoteOrderByCreatedAtDesc(Note note);

    // Ownership-scoped lookup — mirrors findByIdAndWorkspace_User on NoteRepository
    Optional<Resource> findByIdAndNote_Workspace_User(Long id, User user);

    long countByNote_Workspace_User(User user);

    List<Resource> findByNote_Workspace_UserOrderByCreatedAtDesc(User user);
}