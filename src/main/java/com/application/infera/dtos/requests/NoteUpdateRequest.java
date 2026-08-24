package com.application.infera.dtos.requests;

import lombok.Data;
@Data
public class NoteUpdateRequest {
    private String title;
    private String documentJson;
}