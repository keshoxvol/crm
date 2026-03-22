package ru.vsz.crm.vk.api.dto;

public record VkSyncAllResult(
        int totalConversations,
        int newClientsCreated,
        int existingClientsMatched,
        int totalMessagesSynced) {
}
