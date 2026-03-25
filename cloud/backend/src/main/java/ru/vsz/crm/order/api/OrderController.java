package ru.vsz.crm.order.api;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.vsz.crm.order.api.dto.CreateOrderRequest;
import ru.vsz.crm.order.api.dto.OrderResponse;
import ru.vsz.crm.order.api.dto.UpdateOrderRequest;
import ru.vsz.crm.order.domain.BoatModel;
import ru.vsz.crm.order.domain.OrderSource;
import ru.vsz.crm.order.domain.OrderStatus;
import ru.vsz.crm.order.service.OrderService;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(request);
    }

    @GetMapping
    public List<OrderResponse> findAll(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) OrderSource source,
            @RequestParam(required = false) BoatModel model,
            @RequestParam(required = false) Long clientId) {
        return orderService.findAll(status, source, model, clientId);
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable Long id) {
        return orderService.getById(id);
    }

    @PatchMapping("/{id}")
    public OrderResponse update(@PathVariable Long id, @Valid @RequestBody UpdateOrderRequest request) {
        return orderService.update(id, request);
    }
}
