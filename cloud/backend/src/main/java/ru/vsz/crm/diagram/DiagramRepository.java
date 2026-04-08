package ru.vsz.crm.diagram;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DiagramRepository extends JpaRepository<Diagram, Long> {
    List<Diagram> findAllByOrderByCreatedAtAsc();
}
