package ru.vsz.crm.vk.api;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import ru.vsz.crm.vk.api.dto.SendVkMessageRequest;
import ru.vsz.crm.vk.api.dto.VkDialogSummary;
import ru.vsz.crm.vk.api.dto.VkMessageResponse;
import ru.vsz.crm.vk.api.dto.VkSyncAllResult;
import ru.vsz.crm.vk.service.VkService;
import ru.vsz.crm.vk.service.VkSseService;

@RestController
public class VkController {

    private final VkService vkService;
    private final VkSseService vkSseService;

    public VkController(VkService vkService, VkSseService vkSseService) {
        this.vkService = vkService;
        this.vkSseService = vkSseService;
    }

    @GetMapping("/api/clients/{clientId}/vk-messages")
    public List<VkMessageResponse> getMessages(@PathVariable Long clientId) {
        return vkService.getMessages(clientId);
    }

    @PostMapping("/api/clients/{clientId}/vk-messages/sync")
    public List<VkMessageResponse> sync(@PathVariable Long clientId) {
        return vkService.sync(clientId);
    }

    @PostMapping("/api/clients/{clientId}/vk-messages/send")
    public VkMessageResponse send(@PathVariable Long clientId, @Valid @RequestBody SendVkMessageRequest request) {
        return vkService.sendMessage(clientId, request.text());
    }

    @PostMapping("/api/clients/{clientId}/vk-messages/mark-read")
    public void markAsRead(@PathVariable Long clientId) {
        vkService.markAsRead(clientId);
    }

    @PostMapping("/api/vk/sync-all")
    public VkSyncAllResult syncAll() {
        return vkService.syncAllConversations();
    }

    @GetMapping("/api/vk/dialogs")
    public List<VkDialogSummary> getDialogs() {
        return vkService.getDialogs();
    }

    @GetMapping(value = "/api/vk/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        return vkSseService.subscribe();
    }
}
