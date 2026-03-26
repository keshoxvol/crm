package ru.vsz.crm.document.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "document_version")
public class DocumentVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "s3_key", nullable = false, length = 1000)
    private String s3Key;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Column(name = "size", nullable = false)
    private Long size = 0L;

    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;

    @PrePersist
    void onCreate() {
        uploadedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public String getS3Key() { return s3Key; }
    public void setS3Key(String s3Key) { this.s3Key = s3Key; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }
    public OffsetDateTime getUploadedAt() { return uploadedAt; }
}
