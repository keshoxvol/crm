--liquibase formatted sql

--changeset crm:013-add-bot-state-to-vk-dialog-state
ALTER TABLE vk_dialog_state ADD COLUMN IF NOT EXISTS bot_state VARCHAR(32);
