--liquibase formatted sql
--changeset vsz:008-create-ai-prompt

CREATE TABLE ai_prompt (
    key        VARCHAR(64)  PRIMARY KEY,
    content    TEXT         NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO ai_prompt (key, content) VALUES
    ('analyze_system',
     'Ты аналитик продаж моторных лодок ЛОСЬ 400. Анализируй переписку менеджера с клиентом кратко и по делу. Структурируй ответ: температура (горячий/тёплый/холодный), интерес клиента, рекомендация что предложить.'),
    ('analyze_user',
     'История переписки с клиентом:\n\n{history}\n\nРасскажи о клиенте — горячий он или холодный и что стоит предложить.');
