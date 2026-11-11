package com.application.infera.exception;

public class InvitationEmailMismatchException extends RuntimeException {
    private final String maskedEmail;

    public InvitationEmailMismatchException(String maskedEmail) {
        super("This invitation was sent to a different address.");
        this.maskedEmail = maskedEmail;
    }

    public String getMaskedEmail() { return maskedEmail; }
}