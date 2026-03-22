package ru.vsz.crm.user.service;

import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.vsz.crm.user.api.dto.CreateUserRequest;
import ru.vsz.crm.user.api.dto.UpdateUserRequest;
import ru.vsz.crm.user.api.dto.UserResponse;
import ru.vsz.crm.user.domain.AppUser;
import ru.vsz.crm.user.repository.AppUserRepository;

@Service
public class UserService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();
        appUserRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
            throw new DataIntegrityViolationException("Email already exists");
        });

        AppUser user = new AppUser();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());

        return toResponse(appUserRepository.save(user));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return appUserRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request) {
        AppUser user = appUserRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id));

        if (request.email() != null && !request.email().isBlank()) {
            String normalizedEmail = request.email().trim().toLowerCase();
            appUserRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new DataIntegrityViolationException("Email already exists");
                }
            });
            user.setEmail(normalizedEmail);
        }
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        if (request.role() != null) {
            user.setRole(request.role());
        }

        return toResponse(appUserRepository.save(user));
    }

    private UserResponse toResponse(AppUser user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
