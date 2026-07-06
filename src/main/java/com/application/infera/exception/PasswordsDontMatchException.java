package com.application.infera.exception;

public class PasswordsDontMatchException extends RuntimeException{
    public PasswordsDontMatchException(String message) {
        super(message);
    }
}
