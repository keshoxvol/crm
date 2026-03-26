package ru.vsz.crm.order.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ru.vsz.crm.order.domain.BoatOrder;

public interface OrderRepository extends JpaRepository<BoatOrder, Long>, JpaSpecificationExecutor<BoatOrder> {

    @Modifying(clearAutomatically = true)
    @Query("UPDATE BoatOrder o SET o.clientId = :masterId WHERE o.clientId = :duplicateId")
    void reassignClientId(Long duplicateId, Long masterId);
}
