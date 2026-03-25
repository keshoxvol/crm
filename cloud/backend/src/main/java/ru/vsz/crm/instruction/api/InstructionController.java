package ru.vsz.crm.instruction.api;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.vsz.crm.instruction.api.dto.*;
import ru.vsz.crm.instruction.domain.StepFileType;
import ru.vsz.crm.instruction.service.InstructionNotFoundException;
import ru.vsz.crm.instruction.service.InstructionService;

@RestController
public class InstructionController {

    private final InstructionService service;

    public InstructionController(InstructionService service) {
        this.service = service;
    }

    @GetMapping("/api/instructions")
    public List<InstructionListItem> list() {
        return service.listAll();
    }

    @GetMapping("/api/instructions/{id}")
    public InstructionResponse get(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping("/api/instructions")
    @ResponseStatus(HttpStatus.CREATED)
    public InstructionResponse create(@RequestBody SaveInstructionRequest request) {
        return service.create(request);
    }

    @PutMapping("/api/instructions/{id}")
    public InstructionResponse update(@PathVariable Long id, @RequestBody SaveInstructionRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/api/instructions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    // File upload to a step
    @PostMapping("/api/instructions/steps/{stepId}/files")
    @ResponseStatus(HttpStatus.CREATED)
    public StepFileResponse uploadFile(
            @PathVariable Long stepId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") StepFileType fileType) throws IOException {
        return service.uploadFile(stepId, file, fileType);
    }

    // Replace file — two variants: save (bumpVersion=false) or save with version bump (bumpVersion=true)
    @PutMapping("/api/instructions/files/{fileId}")
    public StepFileResponse replaceFile(
            @PathVariable Long fileId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "bumpVersion", defaultValue = "false") boolean bumpVersion) throws IOException {
        return service.replaceFile(fileId, file, bumpVersion);
    }

    @DeleteMapping("/api/instructions/files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFile(@PathVariable Long fileId) {
        service.deleteFile(fileId);
    }

    @GetMapping("/api/instructions/files/{fileId}/download-url")
    public Map<String, String> getDownloadUrl(@PathVariable Long fileId) {
        return Map.of("url", service.getDownloadUrl(fileId));
    }

    @ExceptionHandler(InstructionNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(InstructionNotFoundException e) {
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
