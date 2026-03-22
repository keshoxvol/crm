package ru.vsz.crm.ai;

import java.util.List;
import java.util.Map;
import ru.vsz.crm.ai.AiService.ChatMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import ru.vsz.crm.vk.service.VkService;

@RestController
public class AiController {

    private final AiService aiService;
    private final VkService vkService;
    private final AiPromptRepository promptRepository;

    public AiController(AiService aiService, VkService vkService, AiPromptRepository promptRepository) {
        this.aiService = aiService;
        this.vkService = vkService;
        this.promptRepository = promptRepository;
    }

    @PostMapping("/api/ai/chat")
    public Map<String, String> chat(@RequestBody List<ChatMessage> messages) {
        return Map.of("reply", aiService.chat(messages));
    }

    @PostMapping("/api/clients/{clientId}/ai-analyze")
    public Map<String, String> analyze(@PathVariable Long clientId) {
        var messages = vkService.getMessages(clientId);
        var analysis = aiService.analyzeClient(messages);
        return Map.of("analysis", analysis);
    }

    @GetMapping("/api/ai/prompts")
    public List<AiPromptResponse> getPrompts() {
        return promptRepository.findAll().stream()
                .map(p -> new AiPromptResponse(p.getKey(), p.getContent(), p.getUpdatedAt().toString()))
                .toList();
    }

    @PutMapping("/api/ai/prompts/{key}")
    public AiPromptResponse updatePrompt(@PathVariable String key, @RequestBody Map<String, String> body) {
        var prompt = promptRepository.findById(key).orElseGet(() -> {
            var p = new AiPrompt();
            p.setKey(key);
            return p;
        });
        prompt.setContent(body.get("content"));
        promptRepository.save(prompt);
        return new AiPromptResponse(prompt.getKey(), prompt.getContent(), prompt.getUpdatedAt().toString());
    }

    @ExceptionHandler(AiNotConfiguredException.class)
    public ResponseEntity<Map<String, String>> handleNotConfigured(AiNotConfiguredException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", e.getMessage()));
    }

    record AiPromptResponse(String key, String content, String updatedAt) {}
}
