package com.application.infera.repositories;

import com.application.infera.models.Note;
import com.application.infera.models.Resource;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByNoteOrderByCreatedAtDesc(Note note);

   
    // Used only AFTER membership is verified (see WorkspaceAccessService.requireResource)
    Optional<Resource> findByIdAndNote_Workspace(Long id, Workspace workspace);

    long countByNote_Workspace_User(User user);

    List<Resource> findByNote_Workspace_UserOrderByCreatedAtDesc(User user);
    // add
    @Query("SELECT r.note.workspace.id, COUNT(r) " +
            "FROM Resource r " +
            "WHERE r.note.workspace.user = :user " +
            "GROUP BY r.note.workspace.id")
    List<Object[]> countResourcesGroupedByWorkspace(@Param("user") User user);
    
    List<Resource> findByNote_Workspace_UserOrderByUpdatedAtDesc(User user);

    List<Resource> findTop5ByNote_Workspace_UserAndTitleContainingIgnoreCase(User user, String query);
}