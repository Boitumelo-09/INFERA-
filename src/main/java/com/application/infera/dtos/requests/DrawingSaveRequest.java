package com.application.infera.dtos.requests;

import lombok.Data;

@Data
public class DrawingSaveRequest {
    private String sceneJson;    // null = leave unchanged
    private String previewSvg;   // null = leave unchanged
}