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

    private static final String DEFAULT_SYSTEM =
            "Ты аналитик продаж моторных лодок ЛОСЬ 400. " +
            "Анализируй переписку менеджера с клиентом кратко и по делу. " +
            "Структурируй ответ: температура (горячий/тёплый/холодный), " +
            "интерес клиента, рекомендация что предложить.";

    private static final String DEFAULT_USER =
            "История переписки с клиентом:\n\n{history}\n\n" +
            "Расскажи о клиенте — горячий он или холодный и что стоит предложить.";

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

        String systemPrompt = promptRepository.findById("analyze_system")
                .map(AiPrompt::getContent).orElse(DEFAULT_SYSTEM);
        String userPrompt = promptRepository.findById("analyze_user")
                .map(AiPrompt::getContent).orElse(DEFAULT_USER)
                .replace("{history}", history.toString());

        var body = Map.of(
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)));

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

    @Transactional(readOnly = true)
    public String suggestReply(List<VkMessageResponse> messages) {
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

        String systemPrompt = promptRepository.findById("suggest_reply_system")
                .map(AiPrompt::getContent)
                .orElse("Ты помощник менеджера по продажам моторных лодок ЛОСЬ 400. Предложи короткий и вежливый ответ клиенту. Верни только текст ответа.");

        var body = Map.of(
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", history.toString())));

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
