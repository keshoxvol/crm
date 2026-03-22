package ru.vsz.crm.client.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.vsz.crm.client.api.dto.ClientChangeLogResponse;
import ru.vsz.crm.client.api.dto.ClientResponse;
import ru.vsz.crm.client.api.dto.CreateClientRequest;
import ru.vsz.crm.client.api.dto.UpdateClientRequest;
import ru.vsz.crm.client.domain.Client;
import ru.vsz.crm.client.domain.ClientChangeLog;
import ru.vsz.crm.client.domain.ClientModelInterest;
import ru.vsz.crm.client.domain.ClientSource;
import ru.vsz.crm.client.domain.ClientStatus;
import ru.vsz.crm.client.domain.ClientTemperature;
import ru.vsz.crm.client.repository.ClientChangeLogRepository;
import ru.vsz.crm.client.repository.ClientRepository;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final ClientChangeLogRepository clientChangeLogRepository;

    public ClientService(ClientRepository clientRepository, ClientChangeLogRepository clientChangeLogRepository) {
        this.clientRepository = clientRepository;
        this.clientChangeLogRepository = clientChangeLogRepository;
    }

    @Transactional
    public ClientResponse create(CreateClientRequest request) {
        Client client = new Client();
        client.setFullName(request.fullName());
        client.setPhone(request.phone().trim());
        client.setVkProfile(request.vkProfile());
        client.setSource(request.source());
        client.setStatus(request.status());
        client.setModelInterest(request.modelInterest() == null ? ClientModelInterest.UNDEFINED : request.modelInterest());
        client.setTemperature(request.temperature() == null ? ClientTemperature.COLD : request.temperature());
        client.setComment(request.comment());
        client.setReminderAt(request.reminderAt());

        Client saved = clientRepository.save(client);
        appendChange(saved.getId(), "CREATED", "client", null, "created");
        return toResponse(saved);
    }

    @Transactional
    public ClientResponse update(Long id, UpdateClientRequest request) {
        Client client = clientRepository.findById(id).orElseThrow(() -> new ClientNotFoundException(id));

        if (request.fullName() != null && !Objects.equals(request.fullName(), client.getFullName())) {
            appendChange(id, "UPDATED", "fullName", client.getFullName(), request.fullName());
            client.setFullName(request.fullName());
        }

        if (request.vkProfile() != null && !Objects.equals(request.vkProfile(), client.getVkProfile())) {
            appendChange(id, "UPDATED", "vkProfile", client.getVkProfile(), request.vkProfile());
            client.setVkProfile(request.vkProfile());
        }

        if (request.source() != null && request.source() != client.getSource()) {
            appendChange(id, "UPDATED", "source", value(client.getSource()), value(request.source()));
            client.setSource(request.source());
        }

        if (request.status() != null && request.status() != client.getStatus()) {
            appendChange(id, "UPDATED", "status", value(client.getStatus()), value(request.status()));
            client.setStatus(request.status());
        }

        if (request.modelInterest() != null && request.modelInterest() != client.getModelInterest()) {
            appendChange(id, "UPDATED", "modelInterest", value(client.getModelInterest()), value(request.modelInterest()));
            client.setModelInterest(request.modelInterest());
        }

        if (request.temperature() != null && request.temperature() != client.getTemperature()) {
            appendChange(id, "UPDATED", "temperature", value(client.getTemperature()), value(request.temperature()));
            client.setTemperature(request.temperature());
        }

        if (request.comment() != null && !Objects.equals(request.comment(), client.getComment())) {
            appendChange(id, "UPDATED", "comment", client.getComment(), request.comment());
            client.setComment(request.comment());
        }

        if (request.reminderAt() != null && !Objects.equals(request.reminderAt(), client.getReminderAt())) {
            appendChange(id, "UPDATED", "reminderAt", value(client.getReminderAt()), value(request.reminderAt()));
            client.setReminderAt(request.reminderAt());
        }

        Client saved = clientRepository.save(client);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ClientResponse getById(Long id) {
        Client client = clientRepository.findById(id).orElseThrow(() -> new ClientNotFoundException(id));
        return toResponse(client);
    }

    @Transactional(readOnly = true)
    public List<ClientResponse> findAll(
            String q,
            ClientStatus status,
            ClientSource source,
            ClientTemperature temperature,
            ClientModelInterest modelInterest) {
        Specification<Client> specification = Specification.where(null);

        if (q != null && !q.isBlank()) {
            String search = "%" + q.trim().toLowerCase() + "%";
            specification = specification.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(cb.coalesce(root.get("fullName"), "")), search),
                    cb.like(cb.lower(cb.coalesce(root.get("phone"), "")), search),
                    cb.like(cb.lower(cb.coalesce(root.get("vkProfile"), "")), search)));
        }
        if (status != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (source != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("source"), source));
        }
        if (temperature != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("temperature"), temperature));
        }
        if (modelInterest != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("modelInterest"), modelInterest));
        }

        List<Client> clients = clientRepository.findAll(specification, Sort.by(Sort.Direction.DESC, "createdAt"));
        return clients.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ClientChangeLogResponse> getHistory(Long clientId) {
        clientRepository.findById(clientId).orElseThrow(() -> new ClientNotFoundException(clientId));
        return clientChangeLogRepository.findAllByClientIdOrderByChangedAtDesc(clientId).stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    private ClientResponse toResponse(Client client) {
        return new ClientResponse(
                client.getId(),
                client.getFullName(),
                client.getPhone(),
                client.getVkProfile(),
                client.getSource(),
                client.getStatus(),
                client.getModelInterest(),
                client.getTemperature(),
                client.getComment(),
                client.getReminderAt(),
                client.getFirstContactAt(),
                client.getCreatedAt(),
                client.getUpdatedAt());
    }

    private ClientChangeLogResponse toHistoryResponse(ClientChangeLog log) {
        return new ClientChangeLogResponse(
                log.getId(),
                log.getClientId(),
                log.getAction(),
                log.getFieldName(),
                log.getOldValue(),
                log.getNewValue(),
                log.getChangedBy(),
                log.getChangedAt());
    }

    private void appendChange(Long clientId, String action, String fieldName, String oldValue, String newValue) {
        ClientChangeLog log = new ClientChangeLog();
        log.setClientId(clientId);
        log.setAction(action);
        log.setFieldName(fieldName);
        log.setOldValue(oldValue);
        log.setNewValue(newValue);
        log.setChangedBy(resolveActor());
        log.setChangedAt(OffsetDateTime.now());
        clientChangeLogRepository.save(log);
    }

    private String resolveActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return "system";
        }
        return authentication.getName();
    }

    private String value(Object value) {
        return value == null ? null : value.toString();
    }
}
