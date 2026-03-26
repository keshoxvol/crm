package ru.vsz.crm.document.api.dto;

import java.time.OffsetDateTime;

public record DocumentVersionDto(
        Long id,
        Integer versionNumber,
        String fileName,
        Long size,
        OffsetDateTime uploadedAt
) {}
