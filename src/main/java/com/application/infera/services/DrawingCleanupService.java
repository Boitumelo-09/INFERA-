package com.application.infera.services;

import com.application.infera.repositories.DrawingRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/* Housekeeping for drawings whose block was deleted from the note.

   On every autosave the saved document is compared with the note's drawing rows:
     - referenced drawings:          orphanedAt cleared
     - unreferenced drawings:        orphanedAt set to "now" the first time they are seen
     - unreferenced for > 24 hours:  deleted

   The grace period exists because the Tiptap block points at its row by id: undo can bring a
   deleted block back, and the row must still be there when it does. */
@Slf4j
@Service
@RequiredArgsConstructor
public class DrawingCleanupService {

    private static final Duration ORPHAN_GRACE = Duration.ofHours(24);

    private final DrawingRepository drawingRepository;
    private final ObjectMapper objectMapper;


    @Transactional
    public void reconcile(Long noteId, String documentJson) {
        if (noteId == null || documentJson == null || documentJson.isBlank()) return;

        List<Long> existing = drawingRepository.findIdsByNoteId(noteId);
        if (existing.isEmpty()) return; // most notes have no drawings: nothing to parse

        Set<Long> referenced = new HashSet<>();
        try {
            JsonNode root = objectMapper.readTree(documentJson);
            if (root == null || !"doc".equals(root.path("type").asText())) return;
            collectDrawingIds(root, referenced);
        } catch (Exception e) {
            // Not Tiptap JSON (older plain-text notes): don't guess, change nothing
            return;
        }

        List<Long> alive = new ArrayList<>();
        List<Long> orphans = new ArrayList<>();
        for (Long id : existing) {
            if (referenced.contains(id)) alive.add(id);
            else orphans.add(id);
        }

        LocalDateTime now = LocalDateTime.now();
        if (!alive.isEmpty()) {
            drawingRepository.clearOrphanMark(noteId, alive);
        }
        if (!orphans.isEmpty()) {
            drawingRepository.markOrphaned(noteId, orphans, now);
            int deleted = drawingRepository.deleteExpiredOrphans(noteId, orphans, now.minus(ORPHAN_GRACE));
            if (deleted > 0) {
                log.info("Deleted {} orphaned drawing(s) of note {}", deleted, noteId);
            }
        }
    }

    // Walks the Tiptap document and collects attrs.drawingId of every "drawing" node, at any depth
    private void collectDrawingIds(JsonNode node, Set<Long> out) {
        if (node == null) return;
        if ("drawing".equals(node.path("type").asText())) {
            JsonNode id = node.path("attrs").path("drawingId");
            if (id.canConvertToLong()) out.add(id.asLong());
        }
        JsonNode content = node.path("content");
        if (content.isArray()) {
            for (JsonNode child : content) collectDrawingIds(child, out);
        }
    }
}