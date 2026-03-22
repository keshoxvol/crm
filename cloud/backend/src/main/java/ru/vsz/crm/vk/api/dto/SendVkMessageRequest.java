package ru.vsz.crm.vk.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendVkMessageRequest(
        @NotBlank @Size(max = 4096) String text) {
}
