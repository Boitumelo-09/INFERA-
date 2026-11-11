package com.application.infera.exception;

public class InvitationInvalidException extends RuntimeException {
    public InvitationInvalidException() { super("This invitation is invalid or has expired."); }
}