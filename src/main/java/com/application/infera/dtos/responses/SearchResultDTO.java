package com.application.infera.dtos.responses;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SearchResultDTO {
    private final String type;   // "note", "workspace", "resource"
    private final Long id;
    private final String title;
    private final String meta;
}