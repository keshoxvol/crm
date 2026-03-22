package ru.vsz.crm.auth.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import ru.vsz.crm.client.api.ApiExceptionHandler;
import ru.vsz.crm.config.SecurityConfig;
import ru.vsz.crm.user.repository.AppUserRepository;

@WebMvcTest(controllers = {AuthController.class, ApiExceptionHandler.class})
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthenticationManager authenticationManager;

    @MockBean
    private AppUserRepository appUserRepository;

    @Test
    void loginShouldReturnAuthHeader() throws Exception {
        User principal = new User("admin@vsz.local", "encoded", java.util.List.of(new SimpleGrantedAuthority("ROLE_SUPERADMIN")));
        when(authenticationManager.authenticate(any())).thenReturn(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));

        String payload = """
                {
                  "email": "admin@vsz.local",
                  "password": "admin123"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authHeader").exists())
                .andExpect(jsonPath("$.role").value("SUPERADMIN"));
    }

    @Test
    @WithMockUser(username = "admin@vsz.local", roles = {"SUPERADMIN"})
    void meShouldReturnCurrentUser() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@vsz.local"))
                .andExpect(jsonPath("$.role").value("SUPERADMIN"));
    }
}
