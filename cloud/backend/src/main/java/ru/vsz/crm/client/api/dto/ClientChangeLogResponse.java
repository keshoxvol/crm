package ru.vsz.crm.client.api.dto;

import java.time.OffsetDateTime;

public record ClientChangeLogResponse(
        Long id,
        Long clientId,
        String action,
        String fieldName,
        String oldValue,
        String newValue,
        String changedBy,
        OffsetDateTime changedAt) {
}
