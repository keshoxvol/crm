package ru.vsz.crm.vk.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import ru.vsz.crm.vk.api.dto.VkCallbackEvent;
import ru.vsz.crm.vk.service.VkService;

@RestController
public class VkCallbackController {

    private final VkService vkService;
    private final String callbackSecret;
    private final String confirmationToken;

    public VkCallbackController(
            VkService vkService,
            @Value("${vk.callback-secret:}") String callbackSecret,
            @Value("${vk.confirmation-token:}") String confirmationToken) {
        this.vkService = vkService;
        this.callbackSecret = callbackSecret;
        this.confirmationToken = confirmationToken;
    }

    @PostMapping(value = "/api/vk/callback", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> callback(@RequestBody VkCallbackEvent event) {
        if (!callbackSecret.isBlank() && !callbackSecret.equals(event.secret())) {
            return ResponseEntity.status(403).body("forbidden");
        }

        if ("confirmation".equals(event.type())) {
            return ResponseEntity.ok(confirmationToken);
        }

        switch (event.type()) {
            case "message_new" -> vkService.processIncomingMessage(event);
            case "message_read" -> vkService.processMessageRead(event);
        }

        return ResponseEntity.ok("ok");
    }
}
