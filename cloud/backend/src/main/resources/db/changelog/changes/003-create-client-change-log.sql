--liquibase formatted sql

--changeset crm:003-create-client-change-log
CREATE TABLE IF NOT EXISTS client_change_log (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL,
    action VARCHAR(32) NOT NULL,
    field_name VARCHAR(64) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_client_change_log_client FOREIGN KEY (client_id) REFERENCES client(id)
);

CREATE INDEX IF NOT EXISTS idx_client_change_log_client_id ON client_change_log (client_id);
CREATE INDEX IF NOT EXISTS idx_client_change_log_changed_at ON client_change_log (changed_at DESC);
