--liquibase formatted sql
--changeset crm:015-create-instructions

CREATE TABLE instruction (
    id BIGSERIAL PRIMARY KEY,
    number INTEGER NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE instruction_step (
    id BIGSERIAL PRIMARY KEY,
    instruction_id BIGINT NOT NULL REFERENCES instruction(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE step_file (
    id BIGSERIAL PRIMARY KEY,
    step_id BIGINT NOT NULL REFERENCES instruction_step(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    file_type VARCHAR(16) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    size BIGINT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
