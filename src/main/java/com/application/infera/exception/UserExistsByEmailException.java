package com.application.infera.exception;

public class UserExistsByEmailException extends RuntimeException{
    public UserExistsByEmailException(String message) {
        super(message);
    }
}
