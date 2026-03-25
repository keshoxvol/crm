package ru.vsz.crm.instruction.api.dto;

import ru.vsz.crm.instruction.domain.StepFileType;
import java.time.OffsetDateTime;

public record StepFileResponse(Long id, String fileName, StepFileType fileType, Integer version, Long size, OffsetDateTime uploadedAt) {}
