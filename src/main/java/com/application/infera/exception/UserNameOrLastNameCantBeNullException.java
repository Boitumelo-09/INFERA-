package com.application.infera.exception;

public class UserNameOrLastNameCantBeNullException extends RuntimeException {
   public UserNameOrLastNameCantBeNullException(String message) {
        super(message);
    }
}
