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
}