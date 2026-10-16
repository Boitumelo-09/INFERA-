package com.application.infera.repositories;

import com.application.infera.models.TodoItem;
import com.application.infera.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TodoItemRepository extends JpaRepository<TodoItem, Long> {

    List<TodoItem> findByUserAndForDateOrderByCreatedAtAsc(User user, LocalDate forDate);

    long countByUserAndForDate(User user, LocalDate forDate);

    // Ownership-scoped lookup, used before toggle/delete
    Optional<TodoItem> findByIdAndUser(Long id, User user);

    // The "rub off" step: every task from a day before today, ticked or not.
    // Needs a transaction — the caller (TodoService) provides it.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from TodoItem t where t.user = :user and t.forDate < :today")
    int deleteBefore(@Param("user") User user, @Param("today") LocalDate today);

    // For your account-deletion cascade (run it inside that method's transaction)
    void deleteByUser(User user);
}