import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileIngestionStatus } from '@/enums';
import { ArchivePasswordPromptStatus } from '@/enums/archive-password-prompt-status.enum';
import { useArchivePasswordPrompt } from '@/hooks/files/use-archive-password-prompt';
import { ApiClientError } from '@/services/shared/api-client';
import type { ArchiveEntryListing } from '@/types/archive.types';

const { mockSubmitArchivePassword } = vi.hoisted(() => ({
  mockSubmitArchivePassword: vi.fn(),
}));

vi.mock('@/repositories/files/files.repository', () => ({
  filesRepository: { submitArchivePassword: mockSubmitArchivePassword },
}));

const SECRET = 'correct-horse-battery-staple';

function encryptedListing(): ArchiveEntryListing {
  return {
    archiveFileId: 'file-1',
    filename: 'secret.7z',
    ingestionStatus: FileIngestionStatus.FAILED,
    extractionError: 'ARCHIVE_ENCRYPTED: all 2 files are password-protected',
    isArchive: true,
    entries: [],
    unlistedEntryCount: 0,
  };
}

function unlockedListing(): ArchiveEntryListing {
  return {
    archiveFileId: 'file-1',
    filename: 'secret.7z',
    ingestionStatus: FileIngestionStatus.COMPLETED,
    extractionError: null,
    isArchive: true,
    entries: [
      {
        archivePath: 'a.txt',
        sizeBytes: 5,
        status: 'included',
        detail: null,
        childFileId: 'c1',
        mimeType: 'text/plain',
        childCount: 0,
      },
    ],
    unlistedEntryCount: 0,
  };
}

function wrapper(client: QueryClient) {
  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return QueryWrapper;
}

describe('useArchivePasswordPrompt', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('closes and clears the password on a right password', async () => {
    mockSubmitArchivePassword.mockResolvedValue(unlockedListing());
    const { result } = renderHook(() => useArchivePasswordPrompt('file-1'), {
      wrapper: wrapper(queryClient),
    });

    act(() => result.current.open());
    act(() => result.current.setPassword(SECRET));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.isOpen).toBe(false));
    expect(result.current.password).toBe('');
    expect(result.current.status).toBe(ArchivePasswordPromptStatus.Idle);
    expect(mockSubmitArchivePassword).toHaveBeenCalledWith('file-1', SECRET);
  });

  it('reports WrongPassword and clears the field when the archive is still encrypted', async () => {
    mockSubmitArchivePassword.mockResolvedValue(encryptedListing());
    const { result } = renderHook(() => useArchivePasswordPrompt('file-1'), {
      wrapper: wrapper(queryClient),
    });

    act(() => result.current.open());
    act(() => result.current.setPassword('wrong-guess'));
    act(() => result.current.submit());

    await waitFor(() =>
      expect(result.current.status).toBe(ArchivePasswordPromptStatus.WrongPassword),
    );
    expect(result.current.password).toBe('');
    expect(result.current.isOpen).toBe(true);
  });

  it('reports the terminal AttemptsExceeded state and refuses to submit again', async () => {
    mockSubmitArchivePassword.mockRejectedValue(
      new ApiClientError({
        message: 'Too many wrong passwords',
        status: 400,
        code: 'ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED',
      }),
    );
    const { result } = renderHook(() => useArchivePasswordPrompt('file-1'), {
      wrapper: wrapper(queryClient),
    });

    act(() => result.current.open());
    act(() => result.current.setPassword('guess-4'));
    act(() => result.current.submit());

    await waitFor(() =>
      expect(result.current.status).toBe(ArchivePasswordPromptStatus.AttemptsExceeded),
    );

    mockSubmitArchivePassword.mockClear();
    act(() => result.current.setPassword('guess-5'));
    act(() => result.current.submit());
    expect(mockSubmitArchivePassword).not.toHaveBeenCalled();
  });

  it('reports a generic Error status for any other failure', async () => {
    mockSubmitArchivePassword.mockRejectedValue(
      new ApiClientError({ message: 'boom', status: 500 }),
    );
    const { result } = renderHook(() => useArchivePasswordPrompt('file-1'), {
      wrapper: wrapper(queryClient),
    });

    act(() => result.current.open());
    act(() => result.current.setPassword(SECRET));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.status).toBe(ArchivePasswordPromptStatus.Error));
  });

  it('never sends the password anywhere but the one mutation call — not to the query cache, not logged', async () => {
    mockSubmitArchivePassword.mockResolvedValue(encryptedListing());
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useArchivePasswordPrompt('file-1'), {
      wrapper: wrapper(queryClient),
    });

    act(() => result.current.open());
    act(() => result.current.setPassword(SECRET));
    act(() => result.current.submit());
    await waitFor(() =>
      expect(result.current.status).toBe(ArchivePasswordPromptStatus.WrongPassword),
    );

    // Exactly one call carried the password: the mutation itself.
    expect(mockSubmitArchivePassword).toHaveBeenCalledTimes(1);
    expect(mockSubmitArchivePassword).toHaveBeenCalledWith('file-1', SECRET);

    const cached = JSON.stringify(
      queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    );
    expect(cached).not.toContain(SECRET);

    const loggedText = [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .map((value) => JSON.stringify(value))
      .join('\n');
    expect(loggedText).not.toContain(SECRET);

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
