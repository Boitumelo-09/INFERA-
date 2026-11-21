ALTER TABLE workspaces
    ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by BIGINT REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_workspaces_deleted_at ON workspaces (deleted_at) WHERE deleted_at IS NOT NULL;