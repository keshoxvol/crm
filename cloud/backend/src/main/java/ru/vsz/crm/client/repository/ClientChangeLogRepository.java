package ru.vsz.crm.client.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ru.vsz.crm.client.domain.ClientChangeLog;

public interface ClientChangeLogRepository extends JpaRepository<ClientChangeLog, Long> {

    List<ClientChangeLog> findAllByClientIdOrderByChangedAtDesc(Long clientId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE ClientChangeLog l SET l.clientId = :masterId WHERE l.clientId = :duplicateId")
    void reassignClientId(Long duplicateId, Long masterId);
}
