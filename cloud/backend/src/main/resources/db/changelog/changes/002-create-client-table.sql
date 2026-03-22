--liquibase formatted sql

--changeset crm:002-create-client-table
CREATE TABLE IF NOT EXISTS client (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    phone VARCHAR(32) NOT NULL,
    vk_profile VARCHAR(255),
    source VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    model_interest VARCHAR(32) NOT NULL DEFAULT 'UNDEFINED',
    temperature VARCHAR(32) NOT NULL DEFAULT 'COLD',
    comment TEXT,
    first_contact_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_phone ON client (phone);
CREATE INDEX IF NOT EXISTS idx_client_status ON client (status);
CREATE INDEX IF NOT EXISTS idx_client_source ON client (source);
CREATE INDEX IF NOT EXISTS idx_client_created_at ON client (created_at DESC);
