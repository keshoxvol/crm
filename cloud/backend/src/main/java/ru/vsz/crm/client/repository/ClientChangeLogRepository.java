package ru.vsz.crm.client.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.vsz.crm.client.domain.ClientChangeLog;

public interface ClientChangeLogRepository extends JpaRepository<ClientChangeLog, Long> {

    List<ClientChangeLog> findAllByClientIdOrderByChangedAtDesc(Long clientId);
}
