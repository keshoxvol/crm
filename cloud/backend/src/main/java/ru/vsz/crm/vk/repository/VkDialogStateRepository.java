package ru.vsz.crm.vk.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.vsz.crm.vk.domain.VkDialogState;

public interface VkDialogStateRepository extends JpaRepository<VkDialogState, Long> {
}
