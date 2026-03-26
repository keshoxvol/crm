--liquibase formatted sql

--changeset vsz:017-update-order-status-funnel
-- Переименовываем старые статусы заявок в этапы воронки
UPDATE boat_order SET status = 'QUALIFICATION' WHERE status = 'IN_PROGRESS';
UPDATE boat_order SET status = 'DEPOSIT'       WHERE status = 'DEPOSIT_PAID';
UPDATE boat_order SET status = 'DELIVERED'     WHERE status = 'COMPLETED';
