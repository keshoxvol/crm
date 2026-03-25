package ru.vsz.crm.order.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import ru.vsz.crm.order.domain.BoatModel;

public record PublicCreateOrderRequest(
        String name,
        @NotBlank @Pattern(regexp = "^[0-9+()\\-\\s]{6,32}$") String phone,
        BoatModel model,
        String notes) {
}
