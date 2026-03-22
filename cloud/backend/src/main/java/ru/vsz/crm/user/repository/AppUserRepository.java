package ru.vsz.crm.user.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.vsz.crm.user.domain.AppUser;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmailIgnoreCase(String email);
}
