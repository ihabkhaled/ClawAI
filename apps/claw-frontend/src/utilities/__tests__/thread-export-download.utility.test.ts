import { describe, expect, it, vi } from 'vitest';

import { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import { downloadThreadExport, threadExportBody } from '@/utilities/thread-export-download.utility';

describe('thread export download', () => {
  it('keeps text exports as they are and pretty-prints JSON', () => {
    expect(threadExportBody('title: x')).toBe('title: x');
    expect(threadExportBody({ a: 1 })).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it.each([
    [ThreadPublicationExportFormat.Markdown, 'thread-publication.md'],
    [ThreadPublicationExportFormat.Json, 'thread-publication.json'],
    [ThreadPublicationExportFormat.Toon, 'thread-publication.toon'],
  ])('names a %s export file', (format, filename) => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    let downloadName = '';
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = create(tag);
      if (tag === 'a') {
        Object.defineProperty(element, 'download', {
          set: (value: string) => {
            downloadName = value;
          },
        });
      }
      return element;
    });

    downloadThreadExport(format, 'body');

    expect(downloadName).toBe(filename);
    expect(click).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
