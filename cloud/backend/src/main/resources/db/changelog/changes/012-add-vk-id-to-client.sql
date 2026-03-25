--liquibase formatted sql

--changeset crm:012-add-vk-id-to-client
-- 1. Добавляем колонку vk_id
ALTER TABLE client ADD COLUMN IF NOT EXISTS vk_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_vk_id ON client (vk_id) WHERE vk_id IS NOT NULL;

-- 2. Мигрируем данные: phone == vk_profile означает, что это VK ID-заглушка, поставленная автосинхронизацией
UPDATE client
SET vk_id = phone::BIGINT
WHERE source = 'VK'
  AND vk_profile IS NOT NULL
  AND phone ~ '^[0-9]{4,20}$'
  AND phone = vk_profile;

-- 3. Делаем phone необязательным
ALTER TABLE client ALTER COLUMN phone DROP NOT NULL;

-- 4. Очищаем телефон-заглушку только там, где мигрировали
UPDATE client
SET phone = NULL
WHERE source = 'VK'
  AND vk_id IS NOT NULL
  AND phone = vk_id::TEXT;
