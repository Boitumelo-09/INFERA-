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
    TAG_CREATED("Created tag", "bi-tag", "resource"),

    // Collaboration. ownerOnly = targetName may be an email, so only OWNERs see it in the workspace feed.
    MEMBER_INVITED("Invited", "bi-person-plus", "created", true),
    MEMBER_INVITE_REVOKED("Revoked invitation for", "bi-person-dash", "danger", true),
    MEMBER_INVITE_DECLINED("Declined invitation to", "bi-person-x", "danger", true),
    MEMBER_JOINED("Joined", "bi-box-arrow-in-right", "created", false),
    MEMBER_LEFT("Left", "bi-box-arrow-left", "danger", false),
    MEMBER_REMOVED("Removed member", "bi-person-x", "danger", false),
    MEMBER_ROLE_CHANGED("Changed role of", "bi-shield-check", "updated", false);

    private final String label;
    private final String icon;
    private final String cssClass;
    private final boolean ownerOnly;

    ActivityType(String label, String icon, String cssClass) {
        this(label, icon, cssClass, false);
    }

    ActivityType(String label, String icon, String cssClass, boolean ownerOnly) {
        this.label = label;
        this.icon = icon;
        this.cssClass = cssClass;
        this.ownerOnly = ownerOnly;
    }

}