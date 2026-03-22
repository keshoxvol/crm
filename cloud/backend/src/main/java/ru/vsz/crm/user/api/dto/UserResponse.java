package ru.vsz.crm.user.api.dto;

import java.time.OffsetDateTime;
import ru.vsz.crm.user.domain.UserRole;

public record UserResponse(
        Long id,
        String email,
        UserRole role,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
