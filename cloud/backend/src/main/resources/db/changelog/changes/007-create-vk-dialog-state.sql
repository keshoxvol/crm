-- liquibase formatted sql
-- changeset vsz:007-create-vk-dialog-state

CREATE TABLE vk_dialog_state (
    client_id    BIGINT      PRIMARY KEY REFERENCES client (id),
    unread_count INTEGER     NOT NULL DEFAULT 0,
    in_read_id   BIGINT      NOT NULL DEFAULT 0,
    out_read_id  BIGINT      NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
