-- The detailed video report of a one-click summary (2026-11-26): a moment about every 10 s,
-- chapters, the overall summary and key quotes, stored as one feed event of its own kind.
ALTER TYPE "LiveFeedEventKind" ADD VALUE IF NOT EXISTS 'REPORT';
