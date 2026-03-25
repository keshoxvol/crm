package ru.vsz.crm.instruction.api.dto;

import java.util.List;

public record SaveInstructionRequest(Integer number, String title, List<StepRequest> steps) {
    public record StepRequest(Long id, Integer stepNumber, String title, String comment) {}
}
