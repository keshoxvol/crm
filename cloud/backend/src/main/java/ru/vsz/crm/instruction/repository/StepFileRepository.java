package ru.vsz.crm.instruction.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.vsz.crm.instruction.domain.StepFile;

public interface StepFileRepository extends JpaRepository<StepFile, Long> {
}
