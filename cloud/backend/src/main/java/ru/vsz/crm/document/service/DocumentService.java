package ru.vsz.crm.document.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import ru.vsz.crm.document.api.dto.*;
import ru.vsz.crm.document.domain.Document;
import ru.vsz.crm.document.domain.DocumentVersion;
import ru.vsz.crm.document.repository.DocumentRepository;
import ru.vsz.crm.document.repository.DocumentVersionRepository;
import ru.vsz.crm.s3.S3Service;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final S3Service s3Service;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentVersionRepository versionRepository,
                           S3Service s3Service) {
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.s3Service = s3Service;
    }

    @Transactional(readOnly = true)
    public List<DocumentListItem> listAll() {
        return documentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toListItem)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getById(Long id) {
        var doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        return toResponse(doc);
    }

    @Transactional
    public DocumentResponse create(String title, String description, MultipartFile file) throws IOException {
        String s3Key = buildS3Key(file.getOriginalFilename());
        s3Service.upload(s3Key, file.getInputStream(), file.getContentType(), file.getSize());

        var doc = new Document();
        doc.setTitle(title);
        doc.setDescription(description);
        doc.setS3Key(s3Key);
        doc.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        doc.setMimeType(file.getContentType());
        doc.setSize(file.getSize());
        doc.setVersion(1);

        return toResponse(documentRepository.save(doc));
    }

    @Transactional
    public DocumentResponse updateMeta(Long id, UpdateDocumentMetaRequest request) {
        var doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        doc.setTitle(request.title());
        doc.setDescription(request.description());
        return toResponse(documentRepository.save(doc));
    }

    @Transactional
    public DocumentResponse replaceFile(Long id, MultipartFile file) throws IOException {
        var doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));

        // Save current version to history
        var history = new DocumentVersion();
        history.setDocument(doc);
        history.setVersionNumber(doc.getVersion());
        history.setS3Key(doc.getS3Key());
        history.setFileName(doc.getFileName());
        history.setSize(doc.getSize());
        versionRepository.save(history);

        // Upload new file
        String oldKey = doc.getS3Key();
        String s3Key = buildS3Key(file.getOriginalFilename());
        s3Service.upload(s3Key, file.getInputStream(), file.getContentType(), file.getSize());
        tryDeleteS3(oldKey);

        doc.setS3Key(s3Key);
        doc.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        doc.setMimeType(file.getContentType());
        doc.setSize(file.getSize());
        doc.setVersion(doc.getVersion() + 1);

        return toResponse(documentRepository.save(doc));
    }

    @Transactional
    public void delete(Long id) {
        var doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        tryDeleteS3(doc.getS3Key());
        for (var v : doc.getVersions()) {
            tryDeleteS3(v.getS3Key());
        }
        documentRepository.delete(doc);
    }

    @Transactional(readOnly = true)
    public String getDownloadUrl(Long id) {
        var doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        return s3Service.presignedDownloadUrl(doc.getS3Key(), Duration.ofMinutes(30));
    }

    @Transactional(readOnly = true)
    public String getVersionDownloadUrl(Long versionId) {
        var ver = versionRepository.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("Версия не найдена: " + versionId));
        return s3Service.presignedDownloadUrl(ver.getS3Key(), Duration.ofMinutes(30));
    }

    private String buildS3Key(String originalName) {
        String ext = "";
        if (originalName != null) {
            int dot = originalName.lastIndexOf('.');
            if (dot >= 0) ext = originalName.substring(dot);
        }
        return "documents/" + UUID.randomUUID() + ext;
    }

    private void tryDeleteS3(String key) {
        try {
            s3Service.delete(key);
        } catch (Exception ignored) {}
    }

    private DocumentListItem toListItem(Document doc) {
        return new DocumentListItem(doc.getId(), doc.getTitle(), doc.getDescription(),
                doc.getFileName(), doc.getSize(), doc.getVersion(), doc.getCreatedAt(), doc.getUpdatedAt());
    }

    private DocumentResponse toResponse(Document doc) {
        var versions = doc.getVersions().stream()
                .map(v -> new DocumentVersionDto(v.getId(), v.getVersionNumber(), v.getFileName(), v.getSize(), v.getUploadedAt()))
                .toList();
        return new DocumentResponse(doc.getId(), doc.getTitle(), doc.getDescription(),
                doc.getFileName(), doc.getMimeType(), doc.getSize(), doc.getVersion(),
                versions, doc.getCreatedAt(), doc.getUpdatedAt());
    }
}
