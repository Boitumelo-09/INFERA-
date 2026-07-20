package com.application.infera.repositories;

import com.application.infera.models.Tag;
import com.application.infera.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {
    Optional<Tag> findByNameIgnoreCase(String name);
    List<Tag> findTop10ByNameContainingIgnoreCaseOrderByNameAsc(String query);

    @Query("SELECT COUNT(DISTINCT t) FROM Note n JOIN n.tags t WHERE n.workspace.user = :user")
    long countDistinctTagsForUser(@Param("user") User user);
}