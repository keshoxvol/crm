package ru.vsz.crm.instruction.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import ru.vsz.crm.instruction.api.dto.*;
import ru.vsz.crm.instruction.domain.*;
import ru.vsz.crm.instruction.repository.*;
import ru.vsz.crm.s3.S3Service;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class InstructionService {

    private final InstructionRepository instructionRepository;
    private final InstructionStepRepository stepRepository;
    private final StepFileRepository fileRepository;
    private final S3Service s3Service;

    public InstructionService(
            InstructionRepository instructionRepository,
            InstructionStepRepository stepRepository,
            StepFileRepository fileRepository,
            S3Service s3Service) {
        this.instructionRepository = instructionRepository;
        this.stepRepository = stepRepository;
        this.fileRepository = fileRepository;
        this.s3Service = s3Service;
    }

    @Transactional(readOnly = true)
    public List<InstructionListItem> listAll() {
        return instructionRepository.findAllByOrderByNumberAsc().stream()
                .map(i -> new InstructionListItem(i.getId(), i.getNumber(), i.getTitle(), i.getUpdatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public InstructionResponse getById(Long id) {
        var instruction = instructionRepository.findById(id)
                .orElseThrow(() -> new InstructionNotFoundException(id));
        return toResponse(instruction);
    }

    @Transactional
    public InstructionResponse create(SaveInstructionRequest request) {
        var instruction = new Instruction();
        instruction.setNumber(request.number());
        instruction.setTitle(request.title());
        applySteps(instruction, request.steps());
        return toResponse(instructionRepository.save(instruction));
    }

    @Transactional
    public InstructionResponse update(Long id, SaveInstructionRequest request) {
        var instruction = instructionRepository.findById(id)
                .orElseThrow(() -> new InstructionNotFoundException(id));
        instruction.setNumber(request.number());
        instruction.setTitle(request.title());
        applySteps(instruction, request.steps());
        return toResponse(instructionRepository.save(instruction));
    }

    @Transactional
    public void delete(Long id) {
        var instruction = instructionRepository.findById(id)
                .orElseThrow(() -> new InstructionNotFoundException(id));
        // delete S3 files
        for (var step : instruction.getSteps()) {
            for (var file : step.getFiles()) {
                tryDeleteS3(file.getS3Key());
            }
        }
        instructionRepository.delete(instruction);
    }

    @Transactional
    public StepFileResponse uploadFile(Long stepId, MultipartFile file, StepFileType fileType) throws IOException {
        var step = stepRepository.findById(stepId)
                .orElseThrow(() -> new IllegalArgumentException("Шаг не найден: " + stepId));

        String ext = "";
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        int dot = originalName.lastIndexOf('.');
        if (dot >= 0) ext = originalName.substring(dot);

        String s3Key = "instructions/" + step.getInstruction().getId() + "/steps/" + stepId + "/" + UUID.randomUUID() + ext;

        s3Service.upload(s3Key, file.getInputStream(), file.getContentType(), file.getSize());

        var stepFile = new StepFile();
        stepFile.setStep(step);
        stepFile.setFileName(originalName);
        stepFile.setS3Key(s3Key);
        stepFile.setFileType(fileType);
        stepFile.setVersion(1);
        stepFile.setSize(file.getSize());

        return toFileResponse(fileRepository.save(stepFile));
    }

    @Transactional
    public StepFileResponse replaceFile(Long fileId, MultipartFile file, boolean bumpVersion) throws IOException {
        var stepFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("Файл не найден: " + fileId));

        String oldKey = stepFile.getS3Key();

        String ext = "";
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        int dot = originalName.lastIndexOf('.');
        if (dot >= 0) ext = originalName.substring(dot);

        Long stepId = stepFile.getStep().getId();
        Long instructionId = stepFile.getStep().getInstruction().getId();
        String s3Key = "instructions/" + instructionId + "/steps/" + stepId + "/" + UUID.randomUUID() + ext;

        s3Service.upload(s3Key, file.getInputStream(), file.getContentType(), file.getSize());
        tryDeleteS3(oldKey);

        stepFile.setFileName(originalName);
        stepFile.setS3Key(s3Key);
        stepFile.setSize(file.getSize());
        if (bumpVersion) {
            stepFile.setVersion(stepFile.getVersion() + 1);
        }

        return toFileResponse(fileRepository.save(stepFile));
    }

    @Transactional
    public void deleteFile(Long fileId) {
        var stepFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("Файл не найден: " + fileId));
        tryDeleteS3(stepFile.getS3Key());
        fileRepository.delete(stepFile);
    }

    @Transactional(readOnly = true)
    public String getDownloadUrl(Long fileId) {
        var stepFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("Файл не найден: " + fileId));
        return s3Service.presignedDownloadUrl(stepFile.getS3Key(), Duration.ofMinutes(30));
    }

    private void applySteps(Instruction instruction, List<SaveInstructionRequest.StepRequest> stepRequests) {
        if (stepRequests == null) return;
        instruction.getSteps().clear();
        for (var sr : stepRequests) {
            var step = new InstructionStep();
            step.setInstruction(instruction);
            step.setStepNumber(sr.stepNumber());
            step.setTitle(sr.title());
            step.setComment(sr.comment());
            instruction.getSteps().add(step);
        }
    }

    private void tryDeleteS3(String key) {
        try {
            s3Service.delete(key);
        } catch (Exception ignored) {}
    }

    private InstructionResponse toResponse(Instruction instruction) {
        var steps = instruction.getSteps().stream().map(s -> new InstructionStepResponse(
                s.getId(),
                s.getStepNumber(),
                s.getTitle(),
                s.getComment(),
                s.getFiles().stream().map(this::toFileResponse).toList()
        )).toList();
        return new InstructionResponse(instruction.getId(), instruction.getNumber(), instruction.getTitle(),
                steps, instruction.getCreatedAt(), instruction.getUpdatedAt());
    }

    private StepFileResponse toFileResponse(StepFile f) {
        return new StepFileResponse(f.getId(), f.getFileName(), f.getFileType(), f.getVersion(), f.getSize(), f.getUploadedAt());
    }
}
