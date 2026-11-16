package com.application.infera.exception;

public class StaleNoteException extends RuntimeException {
    public StaleNoteException() {
        super("This note was changed by someone else. Reload to get the latest version.");
    }
}