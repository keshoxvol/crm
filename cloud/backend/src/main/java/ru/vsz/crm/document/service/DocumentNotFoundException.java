package ru.vsz.crm.document.service;

public class DocumentNotFoundException extends RuntimeException {
    public DocumentNotFoundException(Long id) {
        super("Документ не найден: " + id);
    }
}
