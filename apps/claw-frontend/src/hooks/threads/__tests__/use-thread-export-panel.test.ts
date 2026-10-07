import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import type { ThreadExportFile } from '@/types/thread-export.types';
import { saveThreadFile } from '@/utilities/thread-file-download.utility';

import { useThreadExportPanel } from '../use-thread-export-panel';

vi.mock('@/utilities/thread-file-download.utility', () => ({ saveThreadFile: vi.fn() }));

const FILES: Record<string, ThreadExportFile> = {
  markdown: {
    format: ThreadPublicationExportFormat.Markdown,
    name: 'a.md',
    mime: 'text/markdown',
    content: '# a',
  },
  json: {
    format: ThreadPublicationExportFormat.Json,
    name: 'a.json',
    mime: 'application/json',
    content: '{}',
  },
};

function setup(
  buildFile = vi.fn(
    async (format: ThreadPublicationExportFormat) => FILES[format] as ThreadExportFile,
  ),
) {
  const hook = renderHook(() => useThreadExportPanel({ baseName: 'thread-1', buildFile }));
  return { ...hook, buildFile };
}

describe('useThreadExportPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with Markdown ticked and saves one format as itself', async () => {
    const { result, buildFile } = setup();
    expect([...result.current.selected]).toEqual(['markdown']);

    await act(async () => {
      await result.current.download();
    });

    expect(buildFile).toHaveBeenCalledTimes(1);
    expect(saveThreadFile).toHaveBeenCalledWith('a.md', 'text/markdown', '# a');
  });

  it('saves several formats as one ZIP named after the Thread', async () => {
    const { result, buildFile } = setup();
    act(() => result.current.toggle(ThreadPublicationExportFormat.Json));
    expect(result.current.selected.size).toBe(2);

    await act(async () => {
      await result.current.download();
    });

    expect(buildFile).toHaveBeenCalledTimes(2);
    expect(saveThreadFile).toHaveBeenCalledTimes(1);
    const [name, mime, data] = vi.mocked(saveThreadFile).mock.calls[0] ?? [];
    expect(name).toBe('thread-1.zip');
    expect(mime).toBe('application/zip');
    expect((data as Uint8Array)[0]).toBe(0x50);
    expect((data as Uint8Array)[1]).toBe(0x4b);
  });

  it('cannot download with nothing ticked', () => {
    const { result } = setup();
    act(() => result.current.toggle(ThreadPublicationExportFormat.Markdown));
    expect(result.current.selected.size).toBe(0);
    expect(result.current.canDownload).toBe(false);
  });

  it('reports a failure and saves nothing when a file cannot be built', async () => {
    const { result } = setup(vi.fn().mockRejectedValue(new Error('no draft')));

    await act(async () => {
      await result.current.download();
    });

    await waitFor(() => expect(result.current.hasFailed).toBe(true));
    expect(saveThreadFile).not.toHaveBeenCalled();
    expect(result.current.isBusy).toBe(false);
  });

  it('opens the browser print dialog for PDF', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const { result } = setup();
    act(() => result.current.savePdf());
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
