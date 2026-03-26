package ru.vsz.crm.client.api.dto;

import jakarta.validation.constraints.NotNull;

public record MergeClientsRequest(
        @NotNull Long duplicateId
) {}
