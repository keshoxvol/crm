package ru.vsz.crm.order.api.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import ru.vsz.crm.order.domain.BoatModel;
import ru.vsz.crm.order.domain.OrderSource;
import ru.vsz.crm.order.domain.OrderStatus;

public record OrderResponse(
        Long id,
        Long clientId,
        String clientName,
        String contactName,
        String contactPhone,
        BoatModel model,
        OrderStatus status,
        OrderSource source,
        String desiredColor,
        BigDecimal depositAmount,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
