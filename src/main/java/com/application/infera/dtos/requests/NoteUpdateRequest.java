package com.application.infera.dtos.requests;

import lombok.Data;
@Data
public class NoteUpdateRequest {
    private String title;
    private String documentJson;
    private Long workspaceId;   // null = no change
    private String tags;        // null = no change; comma-separated, same format as NoteRequest
}