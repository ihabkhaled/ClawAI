import { vi } from 'vitest';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { WorkspaceSemanticSearchService } from '../workspace-semantic-search.service';

const { guardedFetch } = vi.hoisted(() => ({ guardedFetch: vi.fn() }));

vi.mock('../../../../common/utilities/guarded-fetch.utility', () => ({ guardedFetch }));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({
      MEMORY_SERVICE_URL: 'http://memory-service:4005',
      INTER_SERVICE_AUTH_TOKEN: 'service-secret-token-0000000000',
    })),
  },
}));

/**
 * memory-service's internal embeddings search requires the service token
 * (security audit 2026-11-27). Without it every inbox semantic search 401s.
 */
describe('WorkspaceSemanticSearchService', () => {
  it('sends the service token to memory-service', async () => {
    guardedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ hits: [], topK: 5, embeddingModel: 'test-embed' }),
    });
    const service = new WorkspaceSemanticSearchService({} as PrismaService);

    await service.search({ userId: 'user-1', query: 'roadmap', topK: 5 } as Parameters<
      WorkspaceSemanticSearchService['search']
    >[0]);

    expect(guardedFetch).toHaveBeenCalledWith(
      'http://memory-service:4005',
      'http://memory-service:4005/api/v1/internal/embeddings/search-workspace-objects',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Service service-secret-token-0000000000',
        }),
      }),
    );
  });
});
