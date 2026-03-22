package ru.vsz.crm.auth.api.dto;

public record LoginResponse(String authHeader, String email, String role) {
}
