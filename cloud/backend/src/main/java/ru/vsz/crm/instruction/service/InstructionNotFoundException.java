package ru.vsz.crm.instruction.service;

public class InstructionNotFoundException extends RuntimeException {
    public InstructionNotFoundException(Long id) {
        super("Инструкция не найдена: " + id);
    }
}
