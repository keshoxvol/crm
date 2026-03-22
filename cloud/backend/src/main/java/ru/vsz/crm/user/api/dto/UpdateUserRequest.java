package ru.vsz.crm.user.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import ru.vsz.crm.user.domain.UserRole;

public record UpdateUserRequest(
        @Email String email,
        @Size(min = 8, max = 72) String password,
        UserRole role) {
}
