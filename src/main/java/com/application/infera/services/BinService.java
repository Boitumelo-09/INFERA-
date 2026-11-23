package com.application.infera.services;

import com.application.infera.config.RecycleBinProperties;
import com.application.infera.dtos.responses.BinRow;
import com.application.infera.enums.WorkspaceRole;
import com.application.infera.models.User;
import com.application.infera.repositories.NoteRepository;
import com.application.infera.repositories.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/* Read side of the recycle bin: what the two bin panels list. Restoring lives in NoteService / WorkspaceService. */
@Service
@RequiredArgsConstructor
public class BinService {

    private final NoteRepository noteRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final RecycleBinProperties recycleBinProperties;

    public enum Kind { NOTE, WORKSPACE }

    // What a bin panel renders. asOf is taken BEFORE the list query, so "Empty bin" can never reach
    // anything deleted after the panel was built. canEmpty: owner of the workspace (or my personal bin) and not empty.
    public record BinPanel(List<BinItem> items, LocalDateTime asOf, boolean canEmpty) { }
    // What one bin row needs on screen. daysLeft is always >= 1 (expired items never reach here).
    public record BinItem(Kind kind, Long id, String title, String workspaceName, String workspaceColor,
                          String deletedBy, LocalDateTime deletedAt, LocalDateTime purgeAt, int daysLeft) {
        public boolean isNote() { return kind == Kind.NOTE; }
    }

    // Workspace bin: EDITOR and OWNER only (a viewer gets WorkspaceAccessDeniedException, a non-member
    // or a workspace in the bin gets WorkspaceNotFoundException). Lists notes deleted by anyone.
    @Transactional(readOnly = true)
    public List<BinItem> workspaceBin(Long workspaceId, User user) {
        workspaceAccessService.requireWorkspace(workspaceId, user, WorkspaceRole.EDITOR);
        LocalDateTime now = LocalDateTime.now();
        return noteRepository.findBinRowsByWorkspace(workspaceId, recycleBinProperties.cutoff()).stream()
                .map(r -> toItem(Kind.NOTE, r, user, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public BinPanel workspacePanel(Long workspaceId, User user) {
        LocalDateTime asOf = LocalDateTime.now();   // BEFORE the query
        List<BinItem> items = workspaceBin(workspaceId, user);   // also does the EDITOR+ gate
        boolean owner = workspaceAccessService.requireRole(workspaceId, user)
                .map(m -> m.getRole() == WorkspaceRole.OWNER)
                .orElse(false);
        return new BinPanel(items, asOf, owner && !items.isEmpty());
    }

    @Transactional(readOnly = true)
    public BinPanel globalPanel(User user) {
        LocalDateTime asOf = LocalDateTime.now();   // BEFORE the query
        List<BinItem> items = globalBin(user);
        return new BinPanel(items, asOf, !items.isEmpty());
    }

    // Global bin: what I deleted in workspaces I own (notes + whole workspaces), newest first.
    @Transactional(readOnly = true)
    public List<BinItem> globalBin(User user) {
        LocalDateTime cutoff = recycleBinProperties.cutoff();
        LocalDateTime now = LocalDateTime.now();
        List<BinItem> items = new ArrayList<>();
        noteRepository.findBinRowsDeletedByOwner(user, cutoff)
                .forEach(r -> items.add(toItem(Kind.NOTE, r, user, now)));
        workspaceRepository.findBinRowsDeletedByOwner(user, cutoff)
                .forEach(r -> items.add(toItem(Kind.WORKSPACE, r, user, now)));
        items.sort(Comparator.comparing(BinItem::deletedAt).reversed());
        return items;
    }

    private BinItem toItem(Kind kind, BinRow r, User viewer, LocalDateTime now) {
        LocalDateTime purgeAt = r.deletedAt().plusDays(recycleBinProperties.getRetentionDays());
        long hoursLeft = Math.max(0, Duration.between(now, purgeAt).toHours());
        int daysLeft = (int) Math.max(1, (hoursLeft + 23) / 24);   // round UP: 1h left still reads "last day"
        return new BinItem(kind, r.id(), r.title(), r.workspaceName(), r.workspaceColor(),
                deletedByLabel(r, viewer), r.deletedAt(), purgeAt, daysLeft);
    }

    // "you" / the member's name / "a former member" (deleted_by is ON DELETE SET NULL)
    private static String deletedByLabel(BinRow r, User viewer) {
        if (r.deletedById() == null) return "a former member";
        if (r.deletedById().equals(viewer.getId())) return "you";
        String name = ((r.deletedByFirstName() == null ? "" : r.deletedByFirstName()) + " "
                + (r.deletedByLastName() == null ? "" : r.deletedByLastName())).trim();
        return name.isEmpty() ? "a member" : name;
    }
}