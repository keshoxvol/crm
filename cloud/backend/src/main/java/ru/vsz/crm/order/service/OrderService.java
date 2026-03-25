package ru.vsz.crm.order.service;

import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.vsz.crm.client.domain.Client;
import ru.vsz.crm.client.domain.ClientSource;
import ru.vsz.crm.client.domain.ClientStatus;
import ru.vsz.crm.client.repository.ClientRepository;
import ru.vsz.crm.order.api.dto.CreateOrderRequest;
import ru.vsz.crm.order.api.dto.OrderResponse;
import ru.vsz.crm.order.api.dto.PublicCreateOrderRequest;
import ru.vsz.crm.order.api.dto.UpdateOrderRequest;
import ru.vsz.crm.order.domain.BoatModel;
import ru.vsz.crm.order.domain.BoatOrder;
import ru.vsz.crm.order.domain.OrderSource;
import ru.vsz.crm.order.domain.OrderStatus;
import ru.vsz.crm.order.repository.OrderRepository;
import ru.vsz.crm.telegram.TelegramService;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ClientRepository clientRepository;
    private final TelegramService telegramService;

    public OrderService(OrderRepository orderRepository, ClientRepository clientRepository, TelegramService telegramService) {
        this.orderRepository = orderRepository;
        this.clientRepository = clientRepository;
        this.telegramService = telegramService;
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        BoatOrder order = new BoatOrder();
        order.setClientId(request.clientId());
        order.setContactName(request.contactName());
        order.setContactPhone(request.contactPhone() != null ? request.contactPhone().trim() : null);
        order.setModel(request.model() != null ? request.model() : BoatModel.UNDEFINED);
        order.setStatus(request.status() != null ? request.status() : OrderStatus.NEW);
        order.setSource(request.source());
        order.setDesiredColor(request.desiredColor());
        order.setDepositAmount(request.depositAmount());
        order.setNotes(request.notes());
        OrderResponse response = toResponse(orderRepository.save(order));
        telegramService.sendMessage(buildNotificationText(response));
        return response;
    }

    @Transactional
    public OrderResponse createFromPublic(PublicCreateOrderRequest request) {
        String phone = request.phone().trim();

        Client client = clientRepository.findFirstByPhone(phone).orElseGet(() -> {
            Client c = new Client();
            c.setPhone(phone);
            c.setFullName(request.name());
            c.setSource(ClientSource.WEBSITE);
            c.setStatus(ClientStatus.NEW);
            return clientRepository.save(c);
        });

        BoatOrder order = new BoatOrder();
        order.setClientId(client.getId());
        order.setContactName(request.name());
        order.setContactPhone(phone);
        order.setModel(request.model() != null ? request.model() : BoatModel.UNDEFINED);
        order.setStatus(OrderStatus.NEW);
        order.setSource(OrderSource.WEBSITE);
        order.setNotes(request.notes());
        OrderResponse response = toResponse(orderRepository.save(order));
        telegramService.sendMessage(buildNotificationText(response));
        return response;
    }

    private String buildNotificationText(OrderResponse order) {
        StringBuilder sb = new StringBuilder();
        sb.append("Новая заявка #").append(order.id()).append("\n");
        sb.append("Источник: ").append(order.source()).append("\n");
        if (order.clientName() != null) {
            sb.append("Клиент: ").append(order.clientName()).append("\n");
        } else if (order.contactName() != null) {
            sb.append("Имя: ").append(order.contactName()).append("\n");
        }
        if (order.contactPhone() != null) {
            sb.append("Телефон: ").append(order.contactPhone()).append("\n");
        }
        if (order.model() != null && order.model() != BoatModel.UNDEFINED) {
            sb.append("Модель: ").append(order.model()).append("\n");
        }
        if (order.notes() != null && !order.notes().isBlank()) {
            sb.append("Комментарий: ").append(order.notes());
        }
        return sb.toString().trim();
    }

    @Transactional
    public OrderResponse update(Long id, UpdateOrderRequest request) {
        BoatOrder order = orderRepository.findById(id).orElseThrow(() -> new OrderNotFoundException(id));

        if (request.clientId() != null) {
            order.setClientId(request.clientId());
        }
        if (request.contactName() != null) {
            order.setContactName(request.contactName());
        }
        if (request.contactPhone() != null) {
            order.setContactPhone(request.contactPhone().trim());
        }
        if (request.model() != null) {
            order.setModel(request.model());
        }
        if (request.status() != null) {
            order.setStatus(request.status());
        }
        if (request.source() != null) {
            order.setSource(request.source());
        }
        if (request.desiredColor() != null) {
            order.setDesiredColor(request.desiredColor());
        }
        if (request.depositAmount() != null) {
            order.setDepositAmount(request.depositAmount());
        }
        if (request.notes() != null) {
            order.setNotes(request.notes());
        }

        return toResponse(orderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public OrderResponse getById(Long id) {
        return toResponse(orderRepository.findById(id).orElseThrow(() -> new OrderNotFoundException(id)));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll(OrderStatus status, OrderSource source, BoatModel model, Long clientId) {
        Specification<BoatOrder> spec = Specification.where(null);

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (source != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("source"), source));
        }
        if (model != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("model"), model));
        }
        if (clientId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("clientId"), clientId));
        }

        return orderRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private OrderResponse toResponse(BoatOrder order) {
        String clientName = null;
        if (order.getClientId() != null) {
            clientName = clientRepository.findById(order.getClientId())
                    .map(c -> c.getFullName() != null ? c.getFullName() : c.getPhone())
                    .orElse(null);
        }
        return new OrderResponse(
                order.getId(),
                order.getClientId(),
                clientName,
                order.getContactName(),
                order.getContactPhone(),
                order.getModel(),
                order.getStatus(),
                order.getSource(),
                order.getDesiredColor(),
                order.getDepositAmount(),
                order.getNotes(),
                order.getCreatedAt(),
                order.getUpdatedAt());
    }
}
