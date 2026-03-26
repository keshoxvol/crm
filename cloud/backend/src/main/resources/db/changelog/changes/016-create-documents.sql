--liquibase formatted sql

--changeset vsz:016-create-documents
CREATE TABLE document (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(255)  NOT NULL,
    description TEXT,
    s3_key      VARCHAR(1000) NOT NULL,
    file_name   VARCHAR(500)  NOT NULL,
    mime_type   VARCHAR(200),
    size        BIGINT        NOT NULL DEFAULT 0,
    version     INTEGER       NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE document_version (
    id             BIGSERIAL PRIMARY KEY,
    document_id    BIGINT        NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    version_number INTEGER       NOT NULL,
    s3_key         VARCHAR(1000) NOT NULL,
    file_name      VARCHAR(500)  NOT NULL,
    size           BIGINT        NOT NULL DEFAULT 0,
    uploaded_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
