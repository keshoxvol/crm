package ru.vsz.crm.auth.api.dto;

public record CurrentUserResponse(String email, String role) {
}
