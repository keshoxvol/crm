package ru.vsz.crm.client.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import ru.vsz.crm.client.domain.Client;

public interface ClientRepository extends JpaRepository<Client, Long>, JpaSpecificationExecutor<Client> {

    Optional<Client> findFirstByPhone(String phone);

    Optional<Client> findFirstByVkProfile(String vkProfile);

    Optional<Client> findFirstByVkId(Long vkId);
}
