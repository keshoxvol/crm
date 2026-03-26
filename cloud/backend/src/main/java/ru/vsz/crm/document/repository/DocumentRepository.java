package ru.vsz.crm.document.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.vsz.crm.document.domain.Document;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findAllByOrderByCreatedAtDesc();
}
