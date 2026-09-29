package com.application.infera.dtos.responses;

import com.application.infera.enums.DrawingMode;
import com.application.infera.models.Drawing;

import java.time.LocalDateTime;

public record DrawingResponse(Long id,
                              Long noteId,
                              DrawingMode mode,
                              String sceneJson,
                              String previewSvg,
                              LocalDateTime createdAt,
                              LocalDateTime updatedAt) {

    public static DrawingResponse from(Drawing d) {
        return new DrawingResponse(d.getId(), d.getNote().getId(), d.getMode(),
                d.getSceneJson(), d.getPreviewSvg(), d.getCreatedAt(), d.getUpdatedAt());
    }
}