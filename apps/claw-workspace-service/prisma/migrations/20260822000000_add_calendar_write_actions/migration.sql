-- Post-pack hardening — calendar write path. Google Calendar and Outlook
-- Calendar were previously read-only; each now supports one write action
-- (create an event) via its provider's standard events-create endpoint.
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'CREATE_GOOGLE_CALENDAR_EVENT';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'CREATE_OUTLOOK_CALENDAR_EVENT';
