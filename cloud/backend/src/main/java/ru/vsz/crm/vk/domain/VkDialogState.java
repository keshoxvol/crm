package ru.vsz.crm.vk.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "vk_dialog_state")
public class VkDialogState {

    @Id
    @Column(name = "client_id")
    private Long clientId;

    /** Кол-во входящих сообщений, которые мы ещё не прочитали */
    @Column(name = "unread_count", nullable = false)
    private int unreadCount;

    /** ID последнего сообщения, которое МЫ прочитали (in_read от VK) */
    @Column(name = "in_read_id", nullable = false)
    private long inReadId;

    /** ID последнего сообщения, которое СОБЕСЕДНИК прочитал (out_read от VK) */
    @Column(name = "out_read_id", nullable = false)
    private long outReadId;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void onSave() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getClientId() { return clientId; }
    public void setClientId(Long clientId) { this.clientId = clientId; }

    public int getUnreadCount() { return unreadCount; }
    public void setUnreadCount(int unreadCount) { this.unreadCount = unreadCount; }

    public long getInReadId() { return inReadId; }
    public void setInReadId(long inReadId) { this.inReadId = inReadId; }

    public long getOutReadId() { return outReadId; }
    public void setOutReadId(long outReadId) { this.outReadId = outReadId; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
