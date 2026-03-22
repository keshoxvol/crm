package ru.vsz.crm.vk.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ru.vsz.crm.vk.domain.VkMessage;

public interface VkMessageRepository extends JpaRepository<VkMessage, Long> {

    List<VkMessage> findAllByClientIdOrderBySentAtAsc(Long clientId);

    Optional<VkMessage> findByClientIdAndVkMsgId(Long clientId, Long vkMsgId);

    Optional<VkMessage> findFirstByClientIdOrderBySentAtDesc(Long clientId);

    int countByClientId(Long clientId);

    @Query("SELECT DISTINCT vm.clientId FROM VkMessage vm")
    List<Long> findAllDistinctClientIds();

    @Query("""
            SELECT vm.clientId FROM VkMessage vm
            WHERE vm.direction = 'IN'
              AND vm.sentAt = (SELECT MAX(vm2.sentAt) FROM VkMessage vm2 WHERE vm2.clientId = vm.clientId)
            """)
    List<Long> findClientIdsWithLastMessageIn();
}
