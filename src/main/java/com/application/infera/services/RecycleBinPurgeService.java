package com.application.infera.services;

import com.application.infera.config.RecycleBinProperties;
import com.application.infera.models.Note;
import com.application.infera.models.Workspace;
import com.application.infera.repositories.NoteRepository;
import com.application.infera.repositories.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Optional;

/* Permanent deletion from the recycle bin: the scheduled expiry job now, "Empty bin" in step 5b.

   Every item is purged in its OWN transaction that starts with a locking select repeating the
   "still in the bin, deleted before X" condition. That is what makes a purge safe against a
   concurrent restore: whichever commits first wins, and the loser finds nothing to do. */
@Service
@Slf4j
@RequiredArgsConstructor
public class RecycleBinPurgeService {

    private final NoteRepository noteRepository;
    private final WorkspaceRepository workspaceRepository;
    private final NoteService noteService;
    private final WorkspaceService workspaceService;
    private final RecycleBinProperties recycleBinProperties;
    private final TransactionTemplate transactionTemplate;

    // Hourly by default (app.recycle-bin.purge-cron). Expired items are already hidden and can't be
    // restored, so users can't tell when exactly this runs.
    @Scheduled(cron = "${app.recycle-bin.purge-cron:0 0 * * * *}")
    public void purgeExpired() {
        IO.println("PURGE STARTED");
        LocalDateTime cutoff = recycleBinProperties.cutoff();
        PageRequest batch = PageRequest.of(0, recycleBinProperties.getPurgeBatchSize());

        int workspaces = 0;
        int notes = 0;

        // Workspaces first: purging one removes its notes too
        for (Long id : workspaceRepository.findDeletedBeforeIds(cutoff, batch)) {
            try {
                if (purgeWorkspaceDeletedBefore(id, cutoff)) workspaces++;
            } catch (RuntimeException e) {
                log.warn("Recycle bin: could not purge workspace {}", id, e);   // skip it, retry next run
            }
        }
        // Queried AFTER the workspaces, so it never sees notes that just went with their workspace
        for (Long id : noteRepository.findDeletedBeforeIds(cutoff, batch)) {
            try {
                if (purgeNoteDeletedBefore(id, cutoff)) notes++;
            } catch (RuntimeException e) {
                log.warn("Recycle bin: could not purge note {}", id, e);
            }
        }

        if (workspaces + notes > 0) {
            log.info("Recycle bin purge: {} workspace(s), {} note(s) permanently deleted", workspaces, notes);
        }
        IO.println("PURGE FINISHED");
    }

    // true = deleted; false = no longer in the bin / not old enough (e.g. restored a moment ago)
    public boolean purgeNoteDeletedBefore(Long noteId, LocalDateTime before) {
        IO.println("PURGE NOTE");
        Boolean done = transactionTemplate.execute(status -> {
            Optional<Note> note = noteRepository.lockDeletedBefore(noteId, before);
            if (note.isEmpty()) return false;
            noteService.purgeNote(note.get());
            return true;
        });
        IO.println("DONE PURGE NOTE");
        return Boolean.TRUE.equals(done);
    }

    public boolean purgeWorkspaceDeletedBefore(Long workspaceId, LocalDateTime before) {
        IO.println("PURGE WORKSPACE");
        Boolean done = transactionTemplate.execute(status -> {
            Optional<Workspace> workspace = workspaceRepository.lockDeletedBefore(workspaceId, before);
            if (workspace.isEmpty()) return false;
            workspaceService.purgeWorkspace(workspace.get());
            return true;
        });
        IO.println("DONE PURGE WORKSPACE");
        return Boolean.TRUE.equals(done);
    }
}