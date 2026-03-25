package ru.vsz.crm.order.service;

public class OrderNotFoundException extends RuntimeException {

    public OrderNotFoundException(Long id) {
        super("Заявка не найдена: " + id);
    }
}
