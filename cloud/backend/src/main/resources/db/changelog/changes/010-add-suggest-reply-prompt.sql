--liquibase formatted sql
--changeset vsz:010-add-suggest-reply-prompt

INSERT INTO ai_prompt (key, content) VALUES
    ('suggest_reply_system',
     'Ты помощник менеджера по продажам моторных лодок ЛОСЬ 400. Предложи короткий и вежливый ответ клиенту на основе истории переписки. Верни только текст ответа, без пояснений, вступлений и кавычек.');
