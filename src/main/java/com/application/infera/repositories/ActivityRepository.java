package com.application.infera.repositories;

import com.application.infera.models.Activity;
import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByUserOrderByCreatedAtDesc(User user);   // top N sliced in service via PageRequest

    List<Activity> findByUserAndCreatedAtAfterOrderByCreatedAtAsc(User user, LocalDateTime after);

    // Distinct calendar dates the user was active on — the raw material for streak calculation
    @Query("SELECT DISTINCT FUNCTION('DATE', a.createdAt) FROM Activity a WHERE a.user = :user ORDER BY FUNCTION('DATE', a.createdAt) DESC")
    List<java.sql.Date> findDistinctActiveDates(@Param("user") User user);

    long countByUser(User user);

    List<Activity> findByWorkspace(Workspace workspace);

    // My own rows, plus other people's rows in my workspaces. Owner-only types only where I own the workspace.
    // Id lists must be non-empty (callers pass a -1 sentinel).
    @Query("""
            SELECT a FROM Activity a JOIN FETCH a.user LEFT JOIN FETCH a.workspace
            WHERE a.user = :me
               OR (a.workspace.id IN :wsIds AND (a.type IN :publicTypes OR a.workspace.id IN :ownedIds))
            ORDER BY a.createdAt DESC
            """)
    List<Activity> findLog(@Param("me") User me,
                           @Param("wsIds") java.util.Collection<Long> wsIds,
                           @Param("ownedIds") java.util.Collection<Long> ownedIds,
                           @Param("publicTypes") java.util.Collection<com.application.infera.enums.ActivityType> publicTypes,
                           org.springframework.data.domain.Pageable pageable);
}