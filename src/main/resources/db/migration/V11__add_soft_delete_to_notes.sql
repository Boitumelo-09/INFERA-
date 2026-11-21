ALTER TABLE notes
    ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by BIGINT REFERENCES users (id) ON DELETE SET NULL;

-- Partial index: only deleted rows are indexed, so it stays tiny and serves the purge job
CREATE INDEX idx_notes_deleted_at ON notes (deleted_at) WHERE deleted_at IS NOT NULL;