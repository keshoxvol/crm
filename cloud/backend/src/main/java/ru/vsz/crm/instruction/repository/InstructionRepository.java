package ru.vsz.crm.instruction.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.vsz.crm.instruction.domain.Instruction;
import java.util.List;

public interface InstructionRepository extends JpaRepository<Instruction, Long> {
    List<Instruction> findAllByOrderByNumberAsc();
}
