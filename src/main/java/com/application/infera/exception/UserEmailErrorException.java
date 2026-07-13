package com.application.infera.exception;

public class UserEmailErrorException extends RuntimeException{
    public UserEmailErrorException(String message) {
        super(message);
    }
}
