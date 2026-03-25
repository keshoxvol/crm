package ru.vsz.crm.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import ru.vsz.crm.vk.api.dto.VkMessageResponse;

@Service
public class AiService {

    private static final String DEFAULT_ANALYZE =
            "Ты опытный менеджер по продажам Вологодского судостроительного завода (ВСЗ).\n\n" +
            "Завод производит моторные лодки из ПНД-пластика:\n" +
            "• ЛОСЬ 400 — открытая, 140 000 ₽\n" +
            "• ЛОСЬ 400 Сохатый — с носовой рубкой, 180 000 ₽\n\n" +
            "Ключевые преимущества: ПНД-пластик не гниёт, не ржавеет, не требует покраски, служит 20+ лет. " +
            "Длина 4 м, грузоподъёмность 300 кг. Учитываем пожелания при изготовлении. " +
            "Доставка по всей России. Производство 2–3 недели.\n\n" +
            "Типичные клиенты: рыбаки, охотники, любители отдыха на воде.\n" +
            "Частые вопросы: какой мотор подойдёт (до 15 л.с.), можно ли доработать лодку, " +
            "стоимость доставки до региона, сравнение с алюминием.\n\n" +
            "Сигналы горячего клиента: спрашивает про оплату, аванс, реквизиты, конкретные сроки, " +
            "доставку с указанием города, говорит «хочу заказать».\n" +
            "Сигналы тёплого: уточняет характеристики, сравнивает модели, интересуется опциями, " +
            "возвращается с новыми вопросами.\n" +
            "Сигналы холодного: общие вопросы без конкретики, давно не пишет, не реагирует на ответы.\n\n" +
            "История переписки с клиентом:\n\n{history}\n\n" +
            "Проанализируй и ответь строго по структуре:\n\n" +
            "🌡 ТЕМПЕРАТУРА: [ХОЛОДНЫЙ / ТЁПЛЫЙ / ГОРЯЧИЙ]\n" +
            "Обоснование: (1–2 предложения)\n\n" +
            "🎯 ИНТЕРЕС:\n" +
            "(Что ищет клиент, какая модель, для каких целей)\n\n" +
            "⚠️ ВОЗРАЖЕНИЯ:\n" +
            "(Что останавливает или беспокоит, если есть — иначе «нет»)\n\n" +
            "➡️ СЛЕДУЮЩИЙ ШАГ:\n" +
            "(Конкретное действие для менеджера)\n\n" +
            "💬 ЧЕРНОВИК ОТВЕТА:\n" +
            "(Готовый текст ответа клиенту — живой, без канцелярщины, от первого лица)";

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd.MM HH:mm");

    private final String apiToken;
    private final String baseUrl;
    private final AiPromptRepository promptRepository;
    private final RestClient restClient;

    public AiService(
            @Value("${timeweb.ai.token:}") String apiToken,
            @Value("${timeweb.ai.base-url:}") String baseUrl,
            AiPromptRepository promptRepository) {
        this.apiToken = apiToken;
        this.baseUrl = baseUrl;
        this.promptRepository = promptRepository;
        this.restClient = RestClient.create();
    }

    public boolean isConfigured() {
        return !apiToken.isBlank() && !baseUrl.isBlank();
    }

    @Transactional(readOnly = true)
    public String analyzeClient(List<VkMessageResponse> messages) {
        if (!isConfigured()) {
            throw new AiNotConfiguredException("AI не настроен (TIMEWEB_AI_TOKEN, TIMEWEB_AI_AGENT_ID)");
        }

        var history = new StringBuilder();
        for (VkMessageResponse msg : messages) {
            String who = "IN".equals(msg.direction()) ? "[Клиент]" : "[Менеджер]";
            String time = msg.sentAt().format(FMT);
            history.append(who).append(" ").append(time).append(": ")
                    .append(msg.text() != null ? msg.text() : "(вложение)").append("\n");
        }

        String prompt = promptRepository.findById("analyze")
                .map(AiPrompt::getContent).orElse(DEFAULT_ANALYZE)
                .replace("{history}", history.toString());

        var body = Map.of(
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)));

        var resp = restClient.post()
                .uri(baseUrl + "/chat/completions")
                .header("Authorization", "Bearer " + apiToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(CompletionResponse.class);

        if (resp == null || resp.choices() == null || resp.choices().isEmpty()) {
            throw new AiNotConfiguredException("Пустой ответ от AI");
        }
        return resp.choices().get(0).message().content();
    }

public record ChatMessage(String role, String content) {}

    @Transactional(readOnly = true)
    public String chat(List<ChatMessage> history) {
        if (!isConfigured()) {
            throw new AiNotConfiguredException("AI не настроен (TIMEWEB_AI_TOKEN, TIMEWEB_AI_AGENT_ID)");
        }

        String systemPrompt = promptRepository.findById("assistant_system")
                .map(AiPrompt::getContent)
                .orElse("Ты помощник менеджера по продажам моторных лодок ЛОСЬ 400.");

        var messages = new java.util.ArrayList<Map<String, String>>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        for (ChatMessage msg : history) {
            messages.add(Map.of("role", msg.role(), "content", msg.content()));
        }

        var resp = restClient.post()
                .uri(baseUrl + "/chat/completions")
                .header("Authorization", "Bearer " + apiToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("messages", messages))
                .retrieve()
                .body(CompletionResponse.class);

        if (resp == null || resp.choices() == null || resp.choices().isEmpty()) {
            throw new AiNotConfiguredException("Пустой ответ от AI");
        }
        return resp.choices().get(0).message().content();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CompletionResponse(List<Choice> choices) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Choice(Message message) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Message(String content) {}
}
