package ru.vsz.crm.document.api.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record DocumentResponse(
        Long id,
        String title,
        String description,
        String fileName,
        String mimeType,
        Long size,
        Integer version,
        List<DocumentVersionDto> versions,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
