package ru.vsz.crm.document.api;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.vsz.crm.document.api.dto.*;
import ru.vsz.crm.document.service.DocumentNotFoundException;
import ru.vsz.crm.document.service.DocumentService;

@RestController
public class DocumentController {

    private final DocumentService service;

    public DocumentController(DocumentService service) {
        this.service = service;
    }

    @GetMapping("/api/documents")
    public List<DocumentListItem> list() {
        return service.listAll();
    }

    @GetMapping("/api/documents/{id}")
    public DocumentResponse get(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping("/api/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse create(
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("file") MultipartFile file) throws IOException {
        return service.create(title, description, file);
    }

    @PutMapping("/api/documents/{id}/meta")
    public DocumentResponse updateMeta(@PathVariable Long id,
                                       @RequestBody UpdateDocumentMetaRequest request) {
        return service.updateMeta(id, request);
    }

    @PutMapping("/api/documents/{id}/file")
    public DocumentResponse replaceFile(@PathVariable Long id,
                                        @RequestParam("file") MultipartFile file) throws IOException {
        return service.replaceFile(id, file);
    }

    @DeleteMapping("/api/documents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/api/documents/{id}/download-url")
    public Map<String, String> getDownloadUrl(@PathVariable Long id) {
        return Map.of("url", service.getDownloadUrl(id));
    }

    @GetMapping("/api/documents/versions/{versionId}/download-url")
    public Map<String, String> getVersionDownloadUrl(@PathVariable Long versionId) {
        return Map.of("url", service.getVersionDownloadUrl(versionId));
    }

    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(DocumentNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
    }
}
