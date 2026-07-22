CREATE TABLE resources (
                           id BIGSERIAL PRIMARY KEY,

                           title VARCHAR(150) NOT NULL,

                           url VARCHAR(500) NOT NULL,

                           description VARCHAR(255),

                           category VARCHAR(20) NOT NULL,

                           note_id BIGINT NOT NULL,

                           created_at TIMESTAMP NOT NULL,

                           updated_at TIMESTAMP NOT NULL,

                           CONSTRAINT fk_resources_note
                               FOREIGN KEY (note_id)
                                   REFERENCES notes(id)
);