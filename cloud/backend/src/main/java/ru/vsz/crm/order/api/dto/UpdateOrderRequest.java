package ru.vsz.crm.order.api.dto;

import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import ru.vsz.crm.order.domain.BoatModel;
import ru.vsz.crm.order.domain.OrderSource;
import ru.vsz.crm.order.domain.OrderStatus;

public record UpdateOrderRequest(
        Long clientId,
        String contactName,
        @Pattern(regexp = "^[0-9+()\\-\\s]{6,32}$") String contactPhone,
        BoatModel model,
        OrderStatus status,
        OrderSource source,
        String desiredColor,
        BigDecimal depositAmount,
        String notes) {
}
