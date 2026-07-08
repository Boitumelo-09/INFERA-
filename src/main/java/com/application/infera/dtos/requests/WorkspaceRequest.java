package com.application.infera.dtos.requests;

import lombok.Data;

@Data
public class WorkspaceRequest {
    private String name;
    private String description;
    private String color;
}
