package ru.vsz.crm.user.api;

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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import ru.vsz.crm.client.api.ApiExceptionHandler;
import ru.vsz.crm.config.SecurityConfig;
import ru.vsz.crm.user.api.dto.UserResponse;
import ru.vsz.crm.user.domain.UserRole;
import ru.vsz.crm.user.repository.AppUserRepository;
import ru.vsz.crm.user.service.UserService;

@WebMvcTest(controllers = {UserController.class, ApiExceptionHandler.class})
@Import(SecurityConfig.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private AppUserRepository appUserRepository;

    @Test
    @WithMockUser(username = "admin@vsz.local", roles = {"SUPERADMIN"})
    void createShouldReturn201() throws Exception {
        when(userService.create(any())).thenReturn(userResponse());

        String payload = """
                {
                  "email": "admin@vsz.local",
                  "password": "secret123",
                  "role": "SUPERADMIN"
                }
                """;

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("admin@vsz.local"));
    }

    @Test
    @WithMockUser(username = "admin@vsz.local", roles = {"SUPERADMIN"})
    void listShouldReturnRows() throws Exception {
        when(userService.list()).thenReturn(List.of(userResponse()));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].role").value("SUPERADMIN"));
    }

    @Test
    @WithMockUser(username = "admin@vsz.local", roles = {"SUPERADMIN"})
    void patchShouldReturn200() throws Exception {
        when(userService.update(eq(1L), any())).thenReturn(userResponse());

        String payload = """
                {
                  "role": "ADMIN"
                }
                """;

        mockMvc.perform(patch("/api/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @WithMockUser(username = "admin@vsz.local", roles = {"SUPERADMIN"})
    void createShouldReturn409OnDuplicateEmail() throws Exception {
        when(userService.create(any())).thenThrow(new DataIntegrityViolationException("Email already exists"));

        String payload = """
                {
                  "email": "admin@vsz.local",
                  "password": "secret123",
                  "role": "SUPERADMIN"
                }
                """;

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("conflict"));
    }

    private UserResponse userResponse() {
        return new UserResponse(
                1L,
                "admin@vsz.local",
                UserRole.SUPERADMIN,
                OffsetDateTime.parse("2026-03-16T12:00:00Z"),
                OffsetDateTime.parse("2026-03-16T12:00:00Z"));
    }
}
