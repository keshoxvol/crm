package ru.vsz.crm.auth.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import ru.vsz.crm.user.domain.AppUser;
import ru.vsz.crm.user.domain.UserRole;
import ru.vsz.crm.user.repository.AppUserRepository;

@Component
public class SuperadminBootstrap implements CommandLineRunner {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public SuperadminBootstrap(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        String defaultEmail = "admin@vsz.local";
        appUserRepository.findByEmailIgnoreCase(defaultEmail).orElseGet(() -> {
            AppUser user = new AppUser();
            user.setEmail(defaultEmail);
            user.setPasswordHash(passwordEncoder.encode("admin123"));
            user.setRole(UserRole.SUPERADMIN);
            return appUserRepository.save(user);
        });
    }
}
