package ru.vsz.crm.instruction.api.dto;

import java.time.OffsetDateTime;

public record InstructionListItem(Long id, Integer number, String title, OffsetDateTime updatedAt) {}
