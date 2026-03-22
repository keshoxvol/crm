package ru.vsz.crm.client.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "client")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "phone", nullable = false, length = 32)
    private String phone;

    @Column(name = "vk_profile")
    private String vkProfile;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 32)
    private ClientSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private ClientStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "model_interest", nullable = false, length = 32)
    private ClientModelInterest modelInterest;

    @Enumerated(EnumType.STRING)
    @Column(name = "temperature", nullable = false, length = 32)
    private ClientTemperature temperature;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @Column(name = "reminder_at")
    private OffsetDateTime reminderAt;

    @Column(name = "first_contact_at", nullable = false)
    private OffsetDateTime firstContactAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (firstContactAt == null) {
            firstContactAt = now;
        }
        createdAt = now;
        updatedAt = now;
        if (modelInterest == null) {
            modelInterest = ClientModelInterest.UNDEFINED;
        }
        if (temperature == null) {
            temperature = ClientTemperature.COLD;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getVkProfile() {
        return vkProfile;
    }

    public void setVkProfile(String vkProfile) {
        this.vkProfile = vkProfile;
    }

    public ClientSource getSource() {
        return source;
    }

    public void setSource(ClientSource source) {
        this.source = source;
    }

    public ClientStatus getStatus() {
        return status;
    }

    public void setStatus(ClientStatus status) {
        this.status = status;
    }

    public ClientModelInterest getModelInterest() {
        return modelInterest;
    }

    public void setModelInterest(ClientModelInterest modelInterest) {
        this.modelInterest = modelInterest;
    }

    public ClientTemperature getTemperature() {
        return temperature;
    }

    public void setTemperature(ClientTemperature temperature) {
        this.temperature = temperature;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public OffsetDateTime getFirstContactAt() {
        return firstContactAt;
    }

    public void setFirstContactAt(OffsetDateTime firstContactAt) {
        this.firstContactAt = firstContactAt;
    }

    public OffsetDateTime getReminderAt() {
        return reminderAt;
    }

    public void setReminderAt(OffsetDateTime reminderAt) {
        this.reminderAt = reminderAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
