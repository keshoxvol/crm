package ru.vsz.crm.document.api.dto;

import java.time.OffsetDateTime;

public record DocumentListItem(
        Long id,
        String title,
        String description,
        String fileName,
        Long size,
        Integer version,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
