-- F099: optional cron for PROMPT routines. NULL keeps the fixed interval, so no existing routine changes.
ALTER TABLE "scheduled_commands" ADD COLUMN "cron" TEXT;
