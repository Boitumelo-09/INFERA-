package com.application.infera.dtos.responses;

import java.time.LocalDateTime;

/* One raw bin row straight from a query (no entities, so no big TEXT columns and no lazy loads).
   For a workspace row, title and workspaceName are both the workspace's name.
   deletedById / names are null when the deleting user's account no longer exists. */
public record BinRow(Long id, String title, String workspaceName, String workspaceColor,
                     Long deletedById, String deletedByFirstName, String deletedByLastName,
                     LocalDateTime deletedAt) {
}