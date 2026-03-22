package ru.vsz.crm.client.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import ru.vsz.crm.client.api.dto.ClientChangeLogResponse;
import ru.vsz.crm.client.api.dto.ClientResponse;
import ru.vsz.crm.client.domain.ClientModelInterest;
import ru.vsz.crm.client.domain.ClientSource;
import ru.vsz.crm.client.domain.ClientStatus;
import ru.vsz.crm.client.domain.ClientTemperature;
import ru.vsz.crm.client.service.ClientService;
import ru.vsz.crm.config.SecurityConfig;
import ru.vsz.crm.user.repository.AppUserRepository;

@WebMvcTest(controllers = {ClientController.class, ApiExceptionHandler.class})
@Import(SecurityConfig.class)
class ClientControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClientService clientService;

    @MockBean
    private AppUserRepository appUserRepository;

    @Test
    void createShouldReturn401WhenUnauthenticated() throws Exception {
        String payload = """
                {
                  "phone": "+79001112233",
                  "source": "WEBSITE",
                  "status": "NEW"
                }
                """;

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "employee")
    void createShouldReturn201WhenPayloadIsValid() throws Exception {
        ClientResponse response = clientResponse();
        when(clientService.create(any())).thenReturn(response);

        String payload = """
                {
                  "fullName": "Иван",
                  "phone": "+79001112233",
                  "source": "WEBSITE",
                  "status": "NEW"
                }
                """;

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.source").value("WEBSITE"))
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.reminderAt").value("2026-03-18T08:00:00Z"));
    }

    @Test
    @WithMockUser(username = "employee")
    void createShouldReturn400WhenPhoneIsInvalid() throws Exception {
        String payload = """
                {
                  "phone": "12",
                  "source": "WEBSITE",
                  "status": "NEW"
                }
                """;

        mockMvc.perform(post("/api/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_error"));
    }

    @Test
    @WithMockUser(username = "employee")
    void listShouldReturnClients() throws Exception {
        when(clientService.findAll(
                        eq("Иван"),
                        eq(ClientStatus.NEW),
                        eq(ClientSource.WEBSITE),
                        eq(ClientTemperature.COLD),
                        eq(ClientModelInterest.UNDEFINED)))
                .thenReturn(List.of(clientResponse()));

        mockMvc.perform(get("/api/clients")
                        .param("q", "Иван")
                        .param("status", "NEW")
                        .param("source", "WEBSITE")
                        .param("temperature", "COLD")
                        .param("modelInterest", "UNDEFINED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].phone").value("+79001112233"));
    }

    @Test
    @WithMockUser(username = "admin")
    void patchShouldUpdateClient() throws Exception {
        when(clientService.update(eq(1L), any())).thenReturn(clientResponse());

        String payload = """
                {
                  "fullName": "Иван Петров"
                }
                """;

        mockMvc.perform(patch("/api/clients/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @WithMockUser(username = "admin")
    void historyShouldReturnRows() throws Exception {
        ClientChangeLogResponse log = new ClientChangeLogResponse(
                100L,
                1L,
                "UPDATED",
                "status",
                "NEW",
                "IN_PROGRESS",
                "admin",
                OffsetDateTime.parse("2026-03-16T10:01:00Z"));

        when(clientService.getHistory(1L)).thenReturn(List.of(log));

        mockMvc.perform(get("/api/clients/1/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fieldName").value("status"))
                .andExpect(jsonPath("$[0].newValue").value("IN_PROGRESS"));
    }

    private ClientResponse clientResponse() {
        return new ClientResponse(
                1L,
                "Иван",
                "+79001112233",
                null,
                ClientSource.WEBSITE,
                ClientStatus.NEW,
                ClientModelInterest.UNDEFINED,
                ClientTemperature.COLD,
                null,
                OffsetDateTime.parse("2026-03-18T08:00:00Z"),
                OffsetDateTime.parse("2026-03-16T10:00:00Z"),
                OffsetDateTime.parse("2026-03-16T10:00:00Z"),
                OffsetDateTime.parse("2026-03-16T10:00:00Z"));
    }
}
