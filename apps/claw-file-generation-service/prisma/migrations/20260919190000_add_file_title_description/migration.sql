-- F3c (ADR-109): the file's title and description, from the AI's own heading.
ALTER TABLE "file_generations" ADD COLUMN "title" TEXT;
ALTER TABLE "file_generations" ADD COLUMN "description" TEXT;
