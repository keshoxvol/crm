package ru.vsz.crm.vk.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

@JsonIgnoreProperties(ignoreUnknown = true)
public record VkCallbackEvent(
        String type,
        JsonNode object,
        @JsonProperty("group_id") long groupId,
        String secret) {}
