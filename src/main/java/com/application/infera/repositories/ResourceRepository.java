package com.application.infera.repositories;

import com.application.infera.models.Note;
import com.application.infera.models.Resource;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByNoteOrderByCreatedAtDesc(Note note);


    // Used only AFTER membership is verified (see WorkspaceAccessService.requireResource)
    Optional<Resource> findByIdAndNote_Workspace(Long id, Workspace workspace);



    @Query("SELECT r FROM Resource r WHERE r.note.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user) " +
            "ORDER BY r.updatedAt DESC")
    List<Resource> findAccessibleByUserOrderByUpdatedAtDesc(@Param("user") User user);

    @Query("SELECT COUNT(r) FROM Resource r WHERE r.note.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user)")
    long countAccessibleByUser(@Param("user") User user);

    @Query("SELECT r.note.workspace.id, COUNT(r) FROM Resource r WHERE r.note.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user) " +
            "GROUP BY r.note.workspace.id")
    List<Object[]> countAccessibleGroupedByWorkspace(@Param("user") User user);

    // Search inside the given workspaces (the caller never passes an empty collection)
    List<Resource> findTop5ByNote_WorkspaceInAndTitleContainingIgnoreCase(Collection<Workspace> workspaces, String query);



    List<Resource> findByNote_Workspace_UserOrderByCreatedAtDesc(User user);

}