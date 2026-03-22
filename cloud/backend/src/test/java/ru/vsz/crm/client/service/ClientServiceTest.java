package ru.vsz.crm.client.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.vsz.crm.client.api.dto.ClientResponse;
import ru.vsz.crm.client.api.dto.UpdateClientRequest;
import ru.vsz.crm.client.domain.Client;
import ru.vsz.crm.client.domain.ClientChangeLog;
import ru.vsz.crm.client.domain.ClientModelInterest;
import ru.vsz.crm.client.domain.ClientSource;
import ru.vsz.crm.client.domain.ClientStatus;
import ru.vsz.crm.client.domain.ClientTemperature;
import ru.vsz.crm.client.repository.ClientChangeLogRepository;
import ru.vsz.crm.client.repository.ClientRepository;

@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private ClientChangeLogRepository clientChangeLogRepository;

    @InjectMocks
    private ClientService clientService;

    @Test
    void updateShouldNotChangePhoneAndShouldUpdateReminder() {
        Client existing = new Client();
        existing.setFullName("Иван");
        existing.setPhone("+79001112233");
        existing.setSource(ClientSource.WEBSITE);
        existing.setStatus(ClientStatus.NEW);
        existing.setModelInterest(ClientModelInterest.UNDEFINED);
        existing.setTemperature(ClientTemperature.COLD);
        existing.setComment("старый");

        OffsetDateTime reminderAt = OffsetDateTime.parse("2026-03-20T10:00:00Z");
        UpdateClientRequest request = new UpdateClientRequest(
                null,
                "+79009998877",
                null,
                null,
                null,
                null,
                null,
                null,
                reminderAt);

        when(clientRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(clientRepository.save(any(Client.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(clientChangeLogRepository.save(any(ClientChangeLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ClientResponse response = clientService.update(1L, request);

        assertThat(response.phone()).isEqualTo("+79001112233");
        assertThat(response.reminderAt()).isEqualTo(reminderAt);

        ArgumentCaptor<ClientChangeLog> captor = ArgumentCaptor.forClass(ClientChangeLog.class);
        verify(clientChangeLogRepository).save(captor.capture());
        assertThat(captor.getValue().getFieldName()).isEqualTo("reminderAt");
    }
}
