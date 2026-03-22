package ru.vsz.crm.vk.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "vk_message")
public class VkMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "vk_msg_id", nullable = false)
    private Long vkMsgId;

    @Column(name = "text", columnDefinition = "text")
    private String text;

    @Column(name = "sent_at", nullable = false)
    private OffsetDateTime sentAt;

    /** "IN" — пользователь → сообщество, "OUT" — сообщество → пользователь */
    @Column(name = "direction", nullable = false, length = 4)
    private String direction;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getClientId() {
        return clientId;
    }

    public void setClientId(Long clientId) {
        this.clientId = clientId;
    }

    public Long getVkMsgId() {
        return vkMsgId;
    }

    public void setVkMsgId(Long vkMsgId) {
        this.vkMsgId = vkMsgId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public OffsetDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(OffsetDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
