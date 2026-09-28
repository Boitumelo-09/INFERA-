package com.application.infera.dtos.requests;

import com.application.infera.enums.DrawingMode;
import lombok.Data;

@Data
public class DrawingCreateRequest {
    private DrawingMode mode;   // null = DRAWING
}