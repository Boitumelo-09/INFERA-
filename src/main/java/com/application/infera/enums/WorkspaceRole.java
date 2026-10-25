package com.application.infera.enums;

public enum WorkspaceRole {
    OWNER(3), EDITOR(2), VIEWER(1);

    private final int level;

    WorkspaceRole(int level) {
        this.level = level;
    }

    /** True if this role grants at least the permissions of the required role. */
    public boolean atLeast(WorkspaceRole required) {
        return this.level >= required.level;
    }
}