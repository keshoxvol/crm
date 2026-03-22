package ru.vsz.crm.vk.api.dto;

import java.time.OffsetDateTime;

public record VkDialogSummary(
        Long clientId,
        String clientName,
        String vkProfile,
        String lastMessageText,
        OffsetDateTime lastMessageAt,
        String lastMessageDirection,
        int messageCount,
        int unreadCount,
        long outReadId) {
}
