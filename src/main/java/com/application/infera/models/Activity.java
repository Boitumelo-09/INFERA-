package com.application.infera.models;

import com.application.infera.enums.ActivityType;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "activities")
@Data
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ActivityType type;

    @Column(nullable = false, length = 150)
    private String targetName;   // snapshot — survives renames/deletes of the original entity

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")   // nullable — lets the feed show a colored badge
    private Workspace workspace;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }
}