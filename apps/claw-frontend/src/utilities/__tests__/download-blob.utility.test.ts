import { afterEach, describe, expect, it, vi } from 'vitest';

import { ensureFilenameExtension, triggerBrowserDownload } from '@/utilities/download-blob.utility';

// A blob URL carries no name: anything saved without an explicit,
// extension-bearing name landed on disk as "blob" (reported 2026-09-25).
describe('ensureFilenameExtension', () => {
  it('keeps a name that already has an extension', () => {
    expect(ensureFilenameExtension('voice-note-2026.webm', 'audio/webm')).toBe(
      'voice-note-2026.webm',
    );
  });

  it('appends the extension for the MIME type, ignoring codec parameters', () => {
    expect(ensureFilenameExtension('clip', 'video/webm;codecs=vp9,opus')).toBe('clip.webm');
    expect(
      ensureFilenameExtension(
        'sheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ).toBe('sheet.xlsx');
  });

  it('never returns an empty name', () => {
    expect(ensureFilenameExtension('   ', 'application/pdf')).toBe('download.pdf');
    expect(ensureFilenameExtension('')).toBe('download');
  });

  it('leaves the name alone for an unknown MIME type', () => {
    expect(ensureFilenameExtension('data', 'application/x-unknown')).toBe('data');
  });
});

describe('triggerBrowserDownload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves under the real name with its extension', () => {
    let savedAs = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      savedAs = this.download;
    });

    triggerBrowserDownload('blob:x', 'recording', 'audio/ogg');

    expect(savedAs).toBe('recording.ogg');
  });
});
