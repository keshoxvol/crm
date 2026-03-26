package ru.vsz.crm.document.api.dto;

public record UpdateDocumentMetaRequest(
        String title,
        String description
) {}
