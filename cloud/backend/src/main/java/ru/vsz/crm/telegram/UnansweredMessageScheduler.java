package ru.vsz.crm.telegram;

import jakarta.annotation.PostConstruct;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import ru.vsz.crm.ai.AiService;
import ru.vsz.crm.client.repository.ClientRepository;
import ru.vsz.crm.vk.repository.VkMessageRepository;
import ru.vsz.crm.vk.service.VkService;

@Component
public class UnansweredMessageScheduler {

    private static final Logger log = LoggerFactory.getLogger(UnansweredMessageScheduler.class);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd.MM HH:mm");

    /** clientId → vkMsgId последнего сообщения, по которому уже отправили уведомление */
    private final Map<Long, Long> notifiedMsgIds = new HashMap<>();

    private final VkMessageRepository messageRepository;
    private final ClientRepository clientRepository;
    private final VkService vkService;
    private final AiService aiService;
    private final TelegramService telegramService;

    public UnansweredMessageScheduler(
            VkMessageRepository messageRepository,
            ClientRepository clientRepository,
            VkService vkService,
            AiService aiService,
            TelegramService telegramService) {
        this.messageRepository = messageRepository;
        this.clientRepository = clientRepository;
        this.vkService = vkService;
        this.aiService = aiService;
        this.telegramService = telegramService;
    }

    @PostConstruct
    public void init() {
        // При старте помечаем все существующие неотвеченные сообщения как уже обработанные,
        // чтобы не спамить в Telegram после перезапуска бекенда
        var clientIds = messageRepository.findClientIdsWithLastMessageIn();
        for (Long clientId : clientIds) {
            messageRepository.findFirstByClientIdOrderBySentAtDesc(clientId)
                    .ifPresent(msg -> notifiedMsgIds.put(clientId, msg.getVkMsgId()));
        }
        log.info("Инициализировано {} неотвеченных диалогов (уведомления не отправляются)", clientIds.size());
    }

    @Scheduled(fixedDelay = 60_000)
    public void checkUnanswered() {
        if (!telegramService.isConfigured() || !aiService.isConfigured()) {
            return;
        }

        var clientIds = messageRepository.findClientIdsWithLastMessageIn();
        for (Long clientId : clientIds) {
            var lastMsg = messageRepository.findFirstByClientIdOrderBySentAtDesc(clientId);
            if (lastMsg.isEmpty()) continue;

            var msg = lastMsg.get();
            // уже уведомляли по этому сообщению
            if (msg.getVkMsgId().equals(notifiedMsgIds.get(clientId))) continue;

            try {
                var messages = vkService.getMessages(clientId);
                var suggestion = aiService.suggestReply(messages);

                var client = clientRepository.findById(clientId).orElse(null);
                String clientName = client != null && client.getFullName() != null
                        ? client.getFullName()
                        : "Клиент #" + clientId;

                String lastText = msg.getText() != null ? msg.getText() : "(вложение)";
                String time = msg.getSentAt().format(FMT);

                String text = String.format(
                        "💬 Нет ответа — %s\n\nПоследнее сообщение (%s):\n%s\n\nПредлагаемый ответ:\n%s",
                        clientName, time, lastText, suggestion);

                telegramService.sendMessage(text);
                notifiedMsgIds.put(clientId, msg.getVkMsgId());
            } catch (Exception e) {
                log.error("Ошибка при обработке клиента {}: {}", clientId, e.getMessage());
            }
        }

        // очищаем уведомления для клиентов, которые больше не в списке ожидающих
        notifiedMsgIds.keySet().retainAll(clientIds);
    }
}
