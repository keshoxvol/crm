package ru.vsz.crm.order.api;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.vsz.crm.order.api.dto.OrderResponse;
import ru.vsz.crm.order.api.dto.PublicCreateOrderRequest;
import ru.vsz.crm.order.service.OrderService;

@RestController
@RequestMapping("/api/public/orders")
public class PublicOrderController {

    private final OrderService orderService;

    public PublicOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody PublicCreateOrderRequest request) {
        return orderService.createFromPublic(request);
    }
}
