import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pluginsRepository } from '../plugins.repository';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: vi.fn() },
}));

const { apiClient } = await import('@/services/shared/api-client');
const mockGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

describe('pluginsRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the catalog with only the filters that are set', async () => {
    mockGet.mockResolvedValue({ data: { items: [], nextCursor: null } });
    const page = await pluginsRepository.listCatalog({
      q: 'fetch',
      category: 'search',
      cursor: 'c1',
      limit: 24,
    });
    expect(mockGet).toHaveBeenCalledWith('/plugins/catalog', {
      q: 'fetch',
      category: 'search',
      cursor: 'c1',
      limit: '24',
    });
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it('sends the locale with the list and the entry', async () => {
    mockGet.mockResolvedValue({ data: { items: [], nextCursor: null } });
    await pluginsRepository.listCatalog({ locale: 'ar' });
    expect(mockGet).toHaveBeenCalledWith('/plugins/catalog', { locale: 'ar' });
    mockGet.mockResolvedValue({ data: { slug: 'weather' } });
    await pluginsRepository.getCatalogEntry('weather', 'fr');
    expect(mockGet).toHaveBeenLastCalledWith('/plugins/catalog/weather', { locale: 'fr' });
  });

  it('sends an empty query when nothing is filtered', async () => {
    mockGet.mockResolvedValue({ data: { items: [], nextCursor: null } });
    await pluginsRepository.listCatalog({});
    expect(mockGet).toHaveBeenCalledWith('/plugins/catalog', {});
  });

  it('reads one entry by slug, encoded', async () => {
    mockGet.mockResolvedValue({ data: { slug: 'web-fetch' } });
    const entry = await pluginsRepository.getCatalogEntry('web fetch/x');
    expect(mockGet).toHaveBeenCalledWith('/plugins/catalog/web%20fetch%2Fx');
    expect(entry).toEqual({ slug: 'web-fetch' });
  });
});
