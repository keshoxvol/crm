package ru.vsz.crm.instruction.api.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record InstructionResponse(Long id, Integer number, String title, List<InstructionStepResponse> steps, OffsetDateTime createdAt, OffsetDateTime updatedAt) {}
