-- "Remember me" (ADR-106): false = a short, browser-session login.
-- Existing sessions keep the long lifetime they were issued with.
ALTER TABLE "sessions" ADD COLUMN "persistent" BOOLEAN NOT NULL DEFAULT true;
