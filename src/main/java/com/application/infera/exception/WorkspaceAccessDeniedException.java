package com.application.infera.exception;

public class WorkspaceAccessDeniedException extends RuntimeException {
    public WorkspaceAccessDeniedException(String message) {
        super(message);
    }
}