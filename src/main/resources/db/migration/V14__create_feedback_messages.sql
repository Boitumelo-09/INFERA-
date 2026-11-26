CREATE TABLE feedback_messages (
                                   id         BIGSERIAL    PRIMARY KEY,
                                   user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                   type       VARCHAR(20)  NOT NULL,
                                   message    TEXT         NOT NULL,
                                   email_sent BOOLEAN      NOT NULL DEFAULT FALSE,
                                   created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_user_created ON feedback_messages (user_id, created_at);