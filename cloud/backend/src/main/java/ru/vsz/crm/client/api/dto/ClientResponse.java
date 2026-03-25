package ru.vsz.crm.client.api.dto;

import java.time.OffsetDateTime;
import ru.vsz.crm.client.domain.ClientModelInterest;
import ru.vsz.crm.client.domain.ClientSource;
import ru.vsz.crm.client.domain.ClientStatus;
import ru.vsz.crm.client.domain.ClientTemperature;

public record ClientResponse(
        Long id,
        String fullName,
        String phone,
        String vkProfile,
        Long vkId,
        ClientSource source,
        ClientStatus status,
        ClientModelInterest modelInterest,
        ClientTemperature temperature,
        String comment,
        OffsetDateTime reminderAt,
        OffsetDateTime firstContactAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
