package com.application.infera.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One line on the dashboard's "Today's focus" list.
 *
 * Belongs straight to a user (there is no workspace in between, unlike notes).
 * forDate is the calendar day the task belongs to; the dashboard only ever shows
 * today's. Unticked tasks from an earlier day are deleted by TodoService,
 * ticked ones stay in the table until the user deletes them.
 */
@Entity
@Table(name = "todo_items")
@Data
public class TodoItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Column is named task_text rather than text: "text" is also a SQL type name
    @Column(name = "task_text", nullable = false, length = 100)
    private String text;

    @Column(nullable = false)
    private boolean done = false;

    @Column(nullable = false)
    private LocalDate forDate;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }
}