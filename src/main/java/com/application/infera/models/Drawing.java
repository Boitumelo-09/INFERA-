
package com.application.infera.models;

import com.application.infera.enums.DrawingMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/* One Excalidraw scene belonging to one note. The Tiptap document only
   stores the drawing's id; the editable scene lives here. previewSvg is a
   derived cache (so inactive blocks and the View modal never need to load
   Excalidraw) — sceneJson stays the source of truth. */
@Entity
@Table(name = "drawings", indexes = @Index(name = "idx_drawings_note_id", columnList = "note_id"))
@Getter
@Setter
public class Drawing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "note_id", nullable = false)
    private Note note;

    @Enumerated(EnumType.STRING)
    @Column(name = "drawing_mode", nullable = false, length = 20)
    private DrawingMode mode = DrawingMode.DRAWING;

    @Column(columnDefinition = "TEXT")   // serialized Excalidraw scene (elements, appState subset, files)
    private String sceneJson;

    @Column(columnDefinition = "TEXT")   // SVG export of the scene, generated client-side on save
    private String previewSvg;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}