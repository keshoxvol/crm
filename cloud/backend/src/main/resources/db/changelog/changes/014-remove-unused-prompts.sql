--liquibase formatted sql
--changeset crm:014-remove-unused-prompts

DELETE FROM ai_prompt WHERE key IN ('analyze_system', 'analyze_user', 'suggest_reply_system');
