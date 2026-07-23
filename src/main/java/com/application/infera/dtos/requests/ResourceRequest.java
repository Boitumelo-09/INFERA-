package com.application.infera.dtos.requests;


import lombok.Data;

@Data
public class ResourceRequest {
    private String title;
    private String url;
    private String description;
    private String category;   // "VIDEO", "ARTICLE", etc — matched to enum in service
    private Long noteId;
}