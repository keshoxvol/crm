package ru.vsz.crm.client.api;

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
import ru.vsz.crm.client.api.dto.ClientChangeLogResponse;
import ru.vsz.crm.client.api.dto.MergeClientsRequest;
import ru.vsz.crm.client.api.dto.UpdateClientRequest;
import ru.vsz.crm.client.domain.ClientModelInterest;
import ru.vsz.crm.client.api.dto.ClientResponse;
import ru.vsz.crm.client.api.dto.CreateClientRequest;
import ru.vsz.crm.client.domain.ClientSource;
import ru.vsz.crm.client.domain.ClientStatus;
import ru.vsz.crm.client.domain.ClientTemperature;
import ru.vsz.crm.client.service.ClientService;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClientResponse create(@Valid @RequestBody CreateClientRequest request) {
        return clientService.create(request);
    }

    @GetMapping("/{id}")
    public ClientResponse getById(@PathVariable Long id) {
        return clientService.getById(id);
    }

    @PatchMapping("/{id}")
    public ClientResponse update(@PathVariable Long id, @Valid @RequestBody UpdateClientRequest request) {
        return clientService.update(id, request);
    }

    @GetMapping
    public List<ClientResponse> findAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ClientStatus status,
            @RequestParam(required = false) ClientSource source,
            @RequestParam(required = false) ClientTemperature temperature,
            @RequestParam(required = false) ClientModelInterest modelInterest) {
        return clientService.findAll(q, status, source, temperature, modelInterest);
    }

    @GetMapping("/{id}/history")
    public List<ClientChangeLogResponse> history(@PathVariable Long id) {
        return clientService.getHistory(id);
    }

    @PostMapping("/{masterId}/merge")
    public ClientResponse merge(@PathVariable Long masterId, @Valid @RequestBody MergeClientsRequest request) {
        return clientService.merge(masterId, request.duplicateId());
    }
}
