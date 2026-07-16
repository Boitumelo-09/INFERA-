CREATE TABLE notes (
                       id BIGSERIAL PRIMARY KEY,

                       title VARCHAR(150) NOT NULL,

                       content TEXT,

                       workspace_id BIGINT NOT NULL,

                       archived BOOLEAN NOT NULL DEFAULT FALSE,

                       created_at TIMESTAMP NOT NULL,

                       updated_at TIMESTAMP NOT NULL,

                       CONSTRAINT fk_notes_workspace
                           FOREIGN KEY (workspace_id)
                               REFERENCES workspaces(id)
                               ON DELETE CASCADE
);