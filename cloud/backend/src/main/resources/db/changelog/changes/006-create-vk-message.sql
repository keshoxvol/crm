-- liquibase formatted sql
-- changeset vsz:006-create-vk-message

CREATE TABLE vk_message (
    id         BIGSERIAL    PRIMARY KEY,
    client_id  BIGINT       NOT NULL REFERENCES client (id),
    vk_msg_id  BIGINT       NOT NULL,
    text       TEXT,
    sent_at    TIMESTAMPTZ  NOT NULL,
    direction  VARCHAR(4)   NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX vk_message_client_id_idx ON vk_message (client_id);
CREATE UNIQUE INDEX vk_message_client_vk_msg_idx ON vk_message (client_id, vk_msg_id);
