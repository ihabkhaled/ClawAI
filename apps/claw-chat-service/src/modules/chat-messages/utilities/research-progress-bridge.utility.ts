import { AiStreamStage } from '../../../common/enums';
import type { ResearchProgressEmitInput } from '../types/stream.types';
import type { ResearchCrawlProgressMessage } from '@claw/shared-types';

/**
 * Maps a SITE_CRAWL progress tick onto the CRAWL_* stage lifecycle.
 *
 * These used to be mapped onto RESEARCH_*, which meant crawling and searching
 * arrived at the UI as the same stage and the user saw one undifferentiated
 * "researching" blob covering two different operations. Crawling a page the
 * user named and searching the web happen at different times and deserve to be
 * shown as what they are.
 *
 * `started` and `robots` both read as CRAWL_STARTED — fetching robots.txt is
 * setup, not a phase a user needs named — and the human-readable `message`
 * carried as a `description` override distinguishes them for anyone watching
 * closely.
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
      return AiStreamStage.CRAWL_STARTED;
    case 'sitemap':
    case 'feed':
      return AiStreamStage.CRAWL_DISCOVERING;
    case 'page':
      return AiStreamStage.CRAWL_READING_PAGE;
    case 'completed':
      return AiStreamStage.CRAWL_COMPLETED;
  }
}
