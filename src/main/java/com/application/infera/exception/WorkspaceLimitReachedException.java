package com.application.infera.exception;

public class WorkspaceLimitReachedException extends RuntimeException{
    public WorkspaceLimitReachedException(String message) {
        super(message);
    }
}
