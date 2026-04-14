import { WorkspaceSearchService } from '../workspace-search.service';

const mockManagerSearch = jest.fn();

const mockSearchManager = {
  search: mockManagerSearch,
};

const mockResponse = { results: [], total: 0, query: 'test' };

describe('WorkspaceSearchService', () => {
  let service: WorkspaceSearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkspaceSearchService(mockSearchManager as never);
  });

  describe('search', () => {
    it('delegates to manager with userId, query, limit, and filters', async () => {
      mockManagerSearch.mockResolvedValue(mockResponse);
      const dto = { query: 'auth', limit: 10 };
      const result = await service.search('user-1', dto as never);
      expect(mockManagerSearch).toHaveBeenCalledWith('user-1', 'auth', 10, {
        types: undefined,
        providers: undefined,
      });
      expect(result).toBe(mockResponse);
    });

    it('passes type and provider filters through', async () => {
      mockManagerSearch.mockResolvedValue(mockResponse);
      const dto = { query: 'ticket', limit: 5, types: ['TICKET'], providers: ['JIRA'] };
      await service.search('user-2', dto as never);
      expect(mockManagerSearch).toHaveBeenCalledWith('user-2', 'ticket', 5, {
        types: ['TICKET'],
        providers: ['JIRA'],
      });
    });
  });

  describe('searchInternal', () => {
    it('delegates to manager with dto.userId', async () => {
      mockManagerSearch.mockResolvedValue(mockResponse);
      const dto = { query: 'decision', userId: 'user-3', limit: 5 };
      const result = await service.searchInternal(dto as never);
      expect(mockManagerSearch).toHaveBeenCalledWith('user-3', 'decision', 5);
      expect(result).toBe(mockResponse);
    });
  });
});
