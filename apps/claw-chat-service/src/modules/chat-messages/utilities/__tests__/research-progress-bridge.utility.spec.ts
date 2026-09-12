import { AiStreamStage } from '../../../../common/enums';
import { mapCrawlPhaseToResearchProgress } from '../research-progress-bridge.utility';
import type { ResearchCrawlProgressMessage } from '@claw/shared-types';

function buildMessage(
  overrides: Partial<ResearchCrawlProgressMessage> = {},
): ResearchCrawlProgressMessage {
  return {
    correlationId: 'thread-1',
    phase: 'page',
    message: 'Fetched https://example.com/',
    pagesFetched: 1,
    pagesDiscovered: 3,
    timestamp: '2026-09-12T00:00:00.000Z',
    ...overrides,
  };
}

describe('mapCrawlPhaseToResearchProgress', () => {
  it.each([
    ['started', AiStreamStage.RESEARCH_STARTED],
    ['robots', AiStreamStage.RESEARCH_STARTED],
    ['sitemap', AiStreamStage.RESEARCH_SOURCES_FOUND],
    ['feed', AiStreamStage.RESEARCH_SOURCES_FOUND],
    ['page', AiStreamStage.RESEARCH_FETCHING],
    ['completed', AiStreamStage.RESEARCH_COMPLETED],
  ] as const)('maps phase=%s to stage=%s', (phase, stage) => {
    const result = mapCrawlPhaseToResearchProgress(buildMessage({ phase }));

    expect(result.stage).toBe(stage);
  });

  it('always carries the human-readable message through as the description override', () => {
    const result = mapCrawlPhaseToResearchProgress(
      buildMessage({ message: 'Discovered 12 sitemap URL(s)' }),
    );

    expect(result.description).toBe('Discovered 12 sitemap URL(s)');
  });

  it('carries pagesDiscovered as sourcesCount for sitemap and feed phases only', () => {
    const sitemap = mapCrawlPhaseToResearchProgress(
      buildMessage({ phase: 'sitemap', pagesDiscovered: 7 }),
    );
    const page = mapCrawlPhaseToResearchProgress(buildMessage({ phase: 'page' }));

    expect(sitemap.details?.sourcesCount).toBe(7);
    expect(page.details).toBeUndefined();
  });
});
