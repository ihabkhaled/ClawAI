import { type Mock, vi } from 'vitest';

import { BusinessException } from '../../../common/errors';
import { executeResearchWebFetch } from '../utilities/ollama-cloud-tool-runner.utility';

vi.mock('../../../common/utilities', () => ({
  httpRequest: vi.fn(),
  fetchPageViaResearch: vi.fn(),
}));

const { fetchPageViaResearch } = (await vi.importMock('../../../common/utilities')) as {
  fetchPageViaResearch: Mock;
};

const call = (args: Record<string, unknown>) => ({
  function: { name: 'web_fetch', arguments: args },
});
const options = { researchServiceUrl: 'http://research.test', userId: 'u1' };

describe('executeResearchWebFetch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the page through research-service for the named user and returns title/content/links', async () => {
    const onDispatch = vi.fn(async () => {});
    fetchPageViaResearch.mockResolvedValue({
      ok: true,
      view: {
        url: 'https://example.com/',
        title: 'Example',
        content: 'Body text',
        links: ['https://example.com/a'],
        servedBy: 'CRAWL4AI',
        archivedAt: null,
      },
    });

    const result = await executeResearchWebFetch(call({ url: 'https://example.com/' }), {
      ...options,
      onDispatch,
    });

    expect(fetchPageViaResearch).toHaveBeenCalledWith(
      'http://research.test',
      expect.objectContaining({ userId: 'u1', url: 'https://example.com/' }),
    );
    expect(onDispatch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(result)).toEqual({
      title: 'Example',
      content: 'Body text',
      links: ['https://example.com/a'],
    });
  });

  it('labels an archived copy for the model', async () => {
    fetchPageViaResearch.mockResolvedValue({
      ok: true,
      view: {
        url: 'https://example.com/',
        title: null,
        content: 'Archived copy, captured 2024-01-01',
        links: [],
        servedBy: 'ARCHIVE_SNAPSHOT',
        archivedAt: '2024-01-01T00:00:00.000Z',
      },
    });
    const result = await executeResearchWebFetch(call({ url: 'https://example.com/' }), options);
    expect(JSON.parse(result)).toMatchObject({ archivedAt: '2024-01-01T00:00:00.000Z' });
  });

  it('a robots refusal fails the tool call and never falls back to a hosted fetch', async () => {
    fetchPageViaResearch.mockResolvedValue({
      ok: false,
      status: 403,
      message: 'Fetching this URL is disallowed by robots.txt',
    });

    await expect(
      executeResearchWebFetch(call({ url: 'https://example.com/private' }), options),
    ).rejects.toMatchObject({ message: expect.stringContaining('robots.txt') });
    expect(fetchPageViaResearch).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing or non-http url before any request', async () => {
    await expect(executeResearchWebFetch(call({}), options)).rejects.toBeInstanceOf(
      BusinessException,
    );
    await expect(
      executeResearchWebFetch(call({ url: 'file:///etc/passwd' }), options),
    ).rejects.toBeInstanceOf(BusinessException);
    expect(fetchPageViaResearch).not.toHaveBeenCalled();
  });
});
