package com.application.infera.exception;

import java.util.List;

public class AccountDeletionBlockedException extends RuntimeException {
    public AccountDeletionBlockedException(List<String> workspaceNames) {
        super("You still own shared workspaces: " + String.join(", ", workspaceNames)
                + ". Delete them or remove their other members first.");
    }
}