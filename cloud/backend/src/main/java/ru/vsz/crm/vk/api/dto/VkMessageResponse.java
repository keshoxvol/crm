package ru.vsz.crm.vk.api.dto;

import java.time.OffsetDateTime;

public record VkMessageResponse(
        Long id,
        Long vkMsgId,
        String text,
        OffsetDateTime sentAt,
        String direction) {
}
