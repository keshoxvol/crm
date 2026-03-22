package ru.vsz.crm.vk.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class VkScheduler {

    private static final Logger log = LoggerFactory.getLogger(VkScheduler.class);

    private final VkService vkService;

    public VkScheduler(VkService vkService) {
        this.vkService = vkService;
    }

    // Каждые 5 минут, с задержкой 1 мин после старта. fixedDelay — следующий запуск через 5 мин ПОСЛЕ завершения предыдущего.
    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT5M")
    public void syncVkMessages() {
        try {
            var result = vkService.syncAllConversations();
            if (result.totalMessagesSynced() > 0) {
                log.info("VK sync: диалогов={}, новых клиентов={}, новых сообщений={}",
                        result.totalConversations(), result.newClientsCreated(), result.totalMessagesSynced());
            }
        } catch (VkNotConfiguredException e) {
            // Токен не настроен — молча пропускаем
        } catch (Exception e) {
            log.warn("VK sync failed: {}", e.getMessage());
        }
    }
}
