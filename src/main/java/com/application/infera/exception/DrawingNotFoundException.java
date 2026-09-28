package com.application.infera.exception;

public class DrawingNotFoundException extends RuntimeException {
    public DrawingNotFoundException(String message) {
        super(message);
    }
}