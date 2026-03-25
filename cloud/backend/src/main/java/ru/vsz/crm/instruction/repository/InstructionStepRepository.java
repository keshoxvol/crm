package ru.vsz.crm.instruction.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.vsz.crm.instruction.domain.InstructionStep;

public interface InstructionStepRepository extends JpaRepository<InstructionStep, Long> {
}
