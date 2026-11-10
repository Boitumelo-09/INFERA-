package com.application.infera.repositories;

import com.application.infera.models.Tag;
import com.application.infera.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {
    Optional<Tag> findByNameIgnoreCase(String name);

    // Tags that appear on notes in workspaces this user belongs to (any role): what autocomplete may suggest
    @Query("SELECT DISTINCT t FROM Note n JOIN n.tags t WHERE n.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user)")
    List<Tag> findAccessibleByUser(@Param("user") User user);

    // Race-safe create. If two requests insert the same new tag at once, the database keeps one row
    // and the other insert does nothing (returns 0) instead of failing. 1 = this call created it.
    @Transactional
    @Modifying
    @Query(value = "INSERT INTO tags (name, created_at) VALUES (:name, :createdAt) ON CONFLICT (name) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@Param("name") String name, @Param("createdAt") LocalDateTime createdAt);


    @Query("SELECT COUNT(DISTINCT t) FROM Note n JOIN n.tags t WHERE n.workspace.id IN " +
            "(SELECT m.workspace.id FROM WorkspaceMember m WHERE m.user = :user)")
    long countDistinctTagsForUser(@Param("user") User user);
}