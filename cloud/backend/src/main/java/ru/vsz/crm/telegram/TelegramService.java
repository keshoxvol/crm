package ru.vsz.crm.telegram;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);

    private final String botToken;
    private final String chatId;
    private final RestClient restClient;

    public TelegramService(
            @Value("${telegram.bot-token:}") String botToken,
            @Value("${telegram.chat-id:}") String chatId) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.restClient = RestClient.create();
    }

    public boolean isConfigured() {
        return !botToken.isBlank() && !chatId.isBlank();
    }

    public void sendMessage(String text) {
        if (!isConfigured()) {
            log.warn("Telegram не настроен, сообщение не отправлено");
            return;
        }
        try {
            restClient.post()
                    .uri("https://api.telegram.org/bot" + botToken + "/sendMessage")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("chat_id", chatId, "text", text))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Ошибка отправки в Telegram: {}", e.getMessage());
        }
    }
}
