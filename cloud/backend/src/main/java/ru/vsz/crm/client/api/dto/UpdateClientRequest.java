package ru.vsz.crm.client.api.dto;

import jakarta.validation.constraints.Pattern;
import java.time.OffsetDateTime;
import ru.vsz.crm.client.domain.ClientModelInterest;
import ru.vsz.crm.client.domain.ClientSource;
import ru.vsz.crm.client.domain.ClientStatus;
import ru.vsz.crm.client.domain.ClientTemperature;

public record UpdateClientRequest(
        String fullName,
        @Pattern(regexp = "^[0-9+()\\-\\s]{6,32}$") String phone,
        String vkProfile,
        ClientSource source,
        ClientStatus status,
        ClientModelInterest modelInterest,
        ClientTemperature temperature,
        String comment,
        OffsetDateTime reminderAt) {
}
