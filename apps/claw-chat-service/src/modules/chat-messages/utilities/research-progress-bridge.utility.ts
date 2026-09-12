import { AiStreamStage } from '../../../common/enums';
import type { ResearchProgressEmitInput } from '../types/stream.types';
import type { ResearchCrawlProgressMessage } from '@claw/shared-types';

/**
 * Maps a SITE_CRAWL progress tick (research-service's own `phase` vocabulary)
 * onto the four-stage `AiStreamStage` lifecycle the frontend already renders
 * via `emitResearchProgress`. Not a 1:1 mapping — `AiStreamStage` was
 * designed for the search-then-fetch enricher, which has no direct
 * "checking robots.txt" equivalent, so `started`/`robots` both read as
 * RESEARCH_STARTED and the human-readable `message` (carried as a
 * `description` override) is what actually distinguishes them for the user.
 */
export function mapCrawlPhaseToResearchProgress(
  payload: ResearchCrawlProgressMessage,
): ResearchProgressEmitInput {
  return {
    stage: crawlPhaseStage(payload.phase),
    description: payload.message,
    details:
      payload.phase === 'sitemap' || payload.phase === 'feed'
        ? { sourcesCount: payload.pagesDiscovered }
        : undefined,
  };
}

function crawlPhaseStage(phase: ResearchCrawlProgressMessage['phase']): AiStreamStage {
  switch (phase) {
    case 'started':
    case 'robots':
      return AiStreamStage.RESEARCH_STARTED;
    case 'sitemap':
    case 'feed':
      return AiStreamStage.RESEARCH_SOURCES_FOUND;
    case 'page':
      return AiStreamStage.RESEARCH_FETCHING;
    case 'completed':
      return AiStreamStage.RESEARCH_COMPLETED;
  }
}
