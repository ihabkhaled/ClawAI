-- The helper that describes an attached image for a lane whose model cannot
-- see (ADR-120, multimodal batch 5). Its output reaches that lane as derived
-- observations, metered on PaygSurface.VISION_HELPER. Seeded rows come from
-- AssistantModelService.onModuleInit (fills a role only while it has no rows).
ALTER TYPE "AssistantModelRole" ADD VALUE IF NOT EXISTS 'VISION_HELPER';
