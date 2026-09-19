-- The models that write an AI-generated file's content become admin-managed (F0).
ALTER TYPE "AssistantModelRole" ADD VALUE IF NOT EXISTS 'FILE_WRITER';
