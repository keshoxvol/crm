package ru.vsz.crm.document.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.vsz.crm.document.domain.DocumentVersion;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {
}
