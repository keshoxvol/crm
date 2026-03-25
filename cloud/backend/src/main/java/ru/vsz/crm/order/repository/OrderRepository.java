package ru.vsz.crm.order.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import ru.vsz.crm.order.domain.BoatOrder;

public interface OrderRepository extends JpaRepository<BoatOrder, Long>, JpaSpecificationExecutor<BoatOrder> {
}
