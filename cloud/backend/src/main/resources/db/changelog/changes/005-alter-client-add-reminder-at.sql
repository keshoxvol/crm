--liquibase formatted sql

--changeset crm:005-alter-client-add-reminder-at
ALTER TABLE client
    ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_client_reminder_at ON client (reminder_at);
