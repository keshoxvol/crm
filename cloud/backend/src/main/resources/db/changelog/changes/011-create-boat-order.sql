--liquibase formatted sql

--changeset crm:011-create-boat-order
CREATE TABLE IF NOT EXISTS boat_order (
    id              BIGSERIAL PRIMARY KEY,
    client_id       BIGINT REFERENCES client(id) ON DELETE SET NULL,
    contact_name    VARCHAR(255),
    contact_phone   VARCHAR(32),
    model           VARCHAR(32) NOT NULL DEFAULT 'UNDEFINED',
    status          VARCHAR(32) NOT NULL DEFAULT 'NEW',
    source          VARCHAR(32) NOT NULL,
    desired_color   VARCHAR(255),
    deposit_amount  NUMERIC(10, 2),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boat_order_status     ON boat_order (status);
CREATE INDEX IF NOT EXISTS idx_boat_order_source     ON boat_order (source);
CREATE INDEX IF NOT EXISTS idx_boat_order_client_id  ON boat_order (client_id);
CREATE INDEX IF NOT EXISTS idx_boat_order_created_at ON boat_order (created_at DESC);
