package com.application.infera.exception;

public class UserDoesntExistByEmailException extends RuntimeException{
    public UserDoesntExistByEmailException(String message) {
        super(message);
    }
}
