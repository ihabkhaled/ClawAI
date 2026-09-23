import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_POLL_LIVE_SLOW_MS } from '@/constants/query-policy.constants';
import { FileIngestionStatus } from '@/enums';
import { useFiles } from '@/hooks/files/use-files';
import type { UploadedFile } from '@/types';
import type { PaginatedFiles } from '@/types/archive.types';

const { mockGetFilesPage } = vi.hoisted(() => ({ mockGetFilesPage: vi.fn() }));

vi.mock('@/repositories/files/files.repository', () => ({
  filesRepository: { getFilesPage: mockGetFilesPage },
}));

function buildFile(ingestionStatus: FileIngestionStatus): UploadedFile {
  return {
    id: `file-${ingestionStatus}`,
    userId: 'user-1',
    filename: 'notes.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    storagePath: '/tmp/notes.pdf',
    ingestionStatus,
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
  } as UploadedFile;
}

function buildPage(files: UploadedFile[]): PaginatedFiles {
  return {
    data: files,
    meta: { total: files.length, page: 1, limit: 20, totalPages: 1 },
  };
}

function wrapper(client: QueryClient) {
  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return QueryWrapper;
}

/** The interval TanStack would actually use right now, conditional form resolved. */
function resolvedInterval(client: QueryClient): number | false | undefined {
  const query = client.getQueryCache().getAll()[0];
  if (query === undefined) {
    return undefined;
  }
  const interval = query.observers[0]?.options.refetchInterval;
  return typeof interval === 'function' ? interval(query) : interval;
}

describe('useFiles polling', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('does not poll when every file has finished ingesting', async () => {
    // The common case, and the expensive one: this endpoint returns ~4.2 MB
    // with no projection, so a fixed timer here costs a full server-side
    // serialisation every tick to learn nothing.
    mockGetFilesPage.mockResolvedValue(buildPage([buildFile(FileIngestionStatus.COMPLETED)]));
    const { result } = renderHook(() => useFiles(), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.files).toHaveLength(1));

    expect(resolvedInterval(queryClient)).toBe(false);
  });

  it('polls while a file is still being ingested', async () => {
    mockGetFilesPage.mockResolvedValue(
      buildPage([
        buildFile(FileIngestionStatus.COMPLETED),
        buildFile(FileIngestionStatus.PROCESSING),
      ]),
    );
    const { result } = renderHook(() => useFiles(), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.files).toHaveLength(2));

    expect(resolvedInterval(queryClient)).toBe(QUERY_POLL_LIVE_SLOW_MS);
  });

  it('polls for a file still queued, not only one in progress', async () => {
    mockGetFilesPage.mockResolvedValue(buildPage([buildFile(FileIngestionStatus.PENDING)]));
    const { result } = renderHook(() => useFiles(), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.files).toHaveLength(1));

    expect(resolvedInterval(queryClient)).toBe(QUERY_POLL_LIVE_SLOW_MS);
  });

  it('stops polling for a file that failed rather than retrying forever', async () => {
    mockGetFilesPage.mockResolvedValue(buildPage([buildFile(FileIngestionStatus.FAILED)]));
    const { result } = renderHook(() => useFiles(), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.files).toHaveLength(1));

    expect(resolvedInterval(queryClient)).toBe(false);
  });

  it('exposes the server pagination meta and forwards parentId for an archive drill-down', async () => {
    mockGetFilesPage.mockResolvedValue(buildPage([buildFile(FileIngestionStatus.COMPLETED)]));
    const { result } = renderHook(() => useFiles({ parentId: 'zip-1', page: 2, limit: 10 }), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.meta).toBeDefined());

    expect(mockGetFilesPage).toHaveBeenCalledWith({ page: '2', limit: '10', parentId: 'zip-1' });
    expect(result.current.meta?.total).toBe(1);
  });
});
