-- Live Intelligence batch 2: platform registry and browser tab-audio capture (additive only).

-- AlterEnum
ALTER TYPE "LiveSourceKind" ADD VALUE IF NOT EXISTS 'PLATFORM';

-- AlterEnum
ALTER TYPE "LiveCapability" ADD VALUE IF NOT EXISTS 'LINK_ONLY';
ALTER TYPE "LiveCapability" ADD VALUE IF NOT EXISTS 'BROWSER_CAPTURE';

-- CreateEnum
CREATE TYPE "LivePlatform" AS ENUM ('YOUTUBE', 'TWITCH', 'KICK', 'FACEBOOK', 'TIKTOK', 'INSTAGRAM', 'RUMBLE', 'BIGO', 'LINKEDIN', 'DISCORD', 'TELEGRAM', 'BILIBILI', 'CHZZK', 'SOOP', 'NIMO');

-- AlterTable
ALTER TABLE "live_streams" ADD COLUMN "platform" "LivePlatform";

-- AlterTable
ALTER TABLE "live_processing_runs" ADD COLUMN "capture_session_id" TEXT;
