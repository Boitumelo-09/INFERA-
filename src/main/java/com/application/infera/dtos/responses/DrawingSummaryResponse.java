package com.application.infera.dtos.responses;

import com.application.infera.enums.DrawingMode;

import java.time.LocalDateTime;

/* Light version of DrawingResponse — no scene data. The repository builds
   this directly through a JPQL constructor expression, so the constructor
   signature must match that query. */
public record DrawingSummaryResponse(Long id,
                                     DrawingMode mode,
                                     String previewSvg,
                                     LocalDateTime updatedAt) {}