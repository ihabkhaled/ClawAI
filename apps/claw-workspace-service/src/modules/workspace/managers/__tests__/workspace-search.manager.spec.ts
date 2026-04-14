import { WorkspaceSearchManager } from '../workspace-search.manager';

const mockSearch = jest.fn();

const mockObjectRepository = {
  search: mockSearch,
};

function makeObj(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'obj-1',
    title: 'Auth redesign PR',
    type: 'PULL_REQUEST',
    provider: 'GITHUB',
    url: 'https://github.com/org/repo/pull/42',
    content: 'We decided to replace session tokens with short-lived JWTs for auth redesign.',
    externalId: 'pr-42',
    connectorId: 'conn-1',
    externalCreatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('WorkspaceSearchManager', () => {
  let manager: WorkspaceSearchManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new WorkspaceSearchManager(mockObjectRepository as never);
  });

  describe('search', () => {
    it('returns mapped results sorted by score descending', async () => {
      const titleMatch = makeObj({ title: 'auth redesign', content: null });
      const contentMatch = makeObj({
        id: 'obj-2',
        title: 'Other PR',
        content: 'auth redesign mentioned here',
      });
      mockSearch.mockResolvedValue([contentMatch, titleMatch]);
      const result = await manager.search('user-1', 'auth redesign', 10);
      expect(result.results[0]!.score).toBeGreaterThan(result.results[1]!.score);
      expect(result.total).toBe(2);
      expect(result.query).toBe('auth redesign');
    });

    it('returns empty results when repository returns none', async () => {
      mockSearch.mockResolvedValue([]);
      const result = await manager.search('user-1', 'unknown query', 10);
      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('scores exact title match as 1.0', async () => {
      const obj = makeObj({ title: 'auth redesign', content: null });
      mockSearch.mockResolvedValue([obj]);
      const result = await manager.search('user-1', 'auth redesign', 10);
      expect(result.results[0]!.score).toBe(1.0);
    });

    it('scores title partial match as 0.8', async () => {
      const obj = makeObj({ title: 'auth redesign discussion', content: null });
      mockSearch.mockResolvedValue([obj]);
      const result = await manager.search('user-1', 'auth redesign', 10);
      expect(result.results[0]!.score).toBe(0.8);
    });

    it('scores content-only match as 0.5', async () => {
      const obj = makeObj({ title: 'Security PR', content: 'auth redesign in content' });
      mockSearch.mockResolvedValue([obj]);
      const result = await manager.search('user-1', 'auth redesign', 10);
      expect(result.results[0]!.score).toBe(0.5);
    });

    it('builds snippet from content containing query', async () => {
      const content = `${'Some prefix text. '.repeat(5)}auth redesign happened here.${' More text.'.repeat(10)}`;
      const obj = makeObj({ title: 'Other', content });
      mockSearch.mockResolvedValue([obj]);
      const result = await manager.search('user-1', 'auth redesign', 10);
      const first = result.results[0]!;
      expect(first.snippet).not.toBeNull();
      expect(first.snippet?.length).toBeLessThanOrEqual(200);
    });

    it('returns null snippet when content is null', async () => {
      const obj = makeObj({ content: null });
      mockSearch.mockResolvedValue([obj]);
      const result = await manager.search('user-1', 'auth', 10);
      expect(result.results[0]!.snippet).toBeNull();
    });

    it('passes filters to repository', async () => {
      mockSearch.mockResolvedValue([]);
      await manager.search('user-1', 'query', 5, {
        types: ['TICKET'] as never,
        providers: ['JIRA'] as never,
      });
      expect(mockSearch).toHaveBeenCalledWith('user-1', 'query', 5, {
        types: ['TICKET'],
        providers: ['JIRA'],
      });
    });
  });
});
