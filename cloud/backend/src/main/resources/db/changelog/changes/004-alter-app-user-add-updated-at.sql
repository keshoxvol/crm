--liquibase formatted sql

--changeset crm:004-alter-app-user-add-updated-at
ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE app_user
SET updated_at = created_at
WHERE updated_at IS NULL;
