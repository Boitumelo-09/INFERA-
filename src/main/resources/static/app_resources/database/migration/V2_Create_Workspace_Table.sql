CREATE TABLE workspaces
(
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    color       VARCHAR(7)   NOT NULL DEFAULT '#ea580c',
    user_id     BIGINT       NOT NULL,
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP    NOT NULL,

    CONSTRAINT fk_workspace_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
            ON DELETE CASCADE
);

INSERT INTO workspaces (
    name,
    description,
    color,
    user_id,
    created_at,
    updated_at
)
VALUES (
           'My Second Workspace',
           'This is my Second workspace',
           '#ea580c',
           22,
           NOW(),
           NOW()
       );


SELECT * FROM workspaces Where description = '';