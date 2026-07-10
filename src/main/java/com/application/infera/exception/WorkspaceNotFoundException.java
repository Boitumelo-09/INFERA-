package com.application.infera.exception;

public class WorkspaceNotFoundException extends RuntimeException{
    public WorkspaceNotFoundException(String message) {
        super(message);
    }
}
