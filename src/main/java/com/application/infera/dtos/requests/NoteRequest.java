package com.application.infera.dtos.requests;

import lombok.Data;

@Data
public class NoteRequest {
    private String title;
    private String content;
    private Long workspaceId;   // which workspace this note belongs to
}