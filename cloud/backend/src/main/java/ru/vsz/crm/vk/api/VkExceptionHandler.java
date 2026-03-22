package ru.vsz.crm.vk.api;

import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import ru.vsz.crm.vk.service.VkApiException;
import ru.vsz.crm.vk.service.VkNotConfiguredException;

@RestControllerAdvice(basePackages = "ru.vsz.crm.vk")
public class VkExceptionHandler {

    @ExceptionHandler(VkNotConfiguredException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Map<String, Object> handleNotConfigured(VkNotConfiguredException ex) {
        return Map.of("error", "vk_not_configured", "message", ex.getMessage(), "timestamp", OffsetDateTime.now());
    }

    @ExceptionHandler(VkApiException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public Map<String, Object> handleApiError(VkApiException ex) {
        return Map.of("error", "vk_api_error", "message", ex.getMessage(), "timestamp", OffsetDateTime.now());
    }
}
