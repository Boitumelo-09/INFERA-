CREATE TABLE users (
                       id BIGSERIAL PRIMARY KEY,

                       first_name VARCHAR(50) NOT NULL,

                       last_name VARCHAR(50) NOT NULL,

                       email VARCHAR(150) NOT NULL UNIQUE,

                       password VARCHAR(255) NOT NULL,

                       role VARCHAR(20) NOT NULL,

                       enabled BOOLEAN NOT NULL DEFAULT TRUE,

                       created_at TIMESTAMP NOT NULL,

                       updated_at TIMESTAMP NOT NULL
);