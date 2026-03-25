package ru.vsz.crm.instruction.api.dto;

import java.util.List;

public record InstructionStepResponse(Long id, Integer stepNumber, String title, String comment, List<StepFileResponse> files) {}
