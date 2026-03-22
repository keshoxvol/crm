package ru.vsz.crm.auth.api;

import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.vsz.crm.auth.api.dto.CurrentUserResponse;
import ru.vsz.crm.auth.api.dto.LoginRequest;
import ru.vsz.crm.auth.api.dto.LoginResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;

    public AuthController(AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(), request.password()));

        User principal = (User) authentication.getPrincipal();
        String role = principal.getAuthorities().stream().findFirst().map(a -> a.getAuthority()).orElse("ROLE_EMPLOYEE");
        if (role.startsWith("ROLE_")) {
            role = role.substring("ROLE_".length());
        }

        String credentials = request.email().trim().toLowerCase() + ":" + request.password();
        String authHeader = "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        return new LoginResponse(authHeader, principal.getUsername(), role);
    }

    @GetMapping("/me")
    public CurrentUserResponse me(Authentication authentication) {
        User principal = (User) authentication.getPrincipal();
        String role = principal.getAuthorities().stream().findFirst().map(a -> a.getAuthority()).orElse("ROLE_EMPLOYEE");
        if (role.startsWith("ROLE_")) {
            role = role.substring("ROLE_".length());
        }
        return new CurrentUserResponse(principal.getUsername(), role);
    }
}
