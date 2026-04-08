--liquibase formatted sql
--changeset crm:018-create-diagram

CREATE TABLE diagram (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    nodes_json TEXT         NOT NULL DEFAULT '[]',
    edges_json TEXT         NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
