package ru.vsz.crm.instruction.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "step_file")
public class StepFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "step_id", nullable = false)
    private InstructionStep step;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "s3_key", nullable = false, length = 500)
    private String s3Key;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false, length = 16)
    private StepFileType fileType;

    @Column(name = "version", nullable = false)
    private Integer version = 1;

    @Column(name = "size")
    private Long size;

    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;

    @PrePersist
    void onCreate() {
        uploadedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public InstructionStep getStep() { return step; }
    public void setStep(InstructionStep step) { this.step = step; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getS3Key() { return s3Key; }
    public void setS3Key(String s3Key) { this.s3Key = s3Key; }
    public StepFileType getFileType() { return fileType; }
    public void setFileType(StepFileType fileType) { this.fileType = fileType; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }
    public OffsetDateTime getUploadedAt() { return uploadedAt; }
}
