package com.application.infera.enums;

import lombok.Getter;

@Getter
public enum ActivityType {
    NOTE_CREATED("Created note", "bi-journal-plus", "created"),
    NOTE_UPDATED("Updated note", "bi-pencil-square", "updated"),
    NOTE_DELETED("Deleted note", "bi-trash", "danger"),
    WORKSPACE_CREATED("Created workspace", "bi-folder-plus", "ws-created"),
    WORKSPACE_UPDATED("Updated workspace", "bi-pencil-square", "updated"),
    WORKSPACE_DELETED("Deleted workspace", "bi-trash", "danger"),
    RESOURCE_ADDED("Saved resource", "bi-link-45deg", "resource"),
    RESOURCE_UPDATED("Updated resource", "bi-pencil-square", "updated"),
    RESOURCE_DELETED("Deleted resource", "bi-trash", "danger"),
    TAG_CREATED("Created tag", "bi-tag", "resource");

    private final String label;
    private final String icon;
    private final String cssClass;

    ActivityType(String label, String icon, String cssClass) {
        this.label = label;
        this.icon = icon;
        this.cssClass = cssClass;
    }

}