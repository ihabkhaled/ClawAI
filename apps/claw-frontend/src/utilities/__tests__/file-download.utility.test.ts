import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveBlobDownload } from '@/utilities/file-download.utility';

describe('saveBlobDownload', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses a temporary object URL and revokes it only after the download had time to start', () => {
    vi.useFakeTimers();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:invoice');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    saveBlobDownload(new Blob(['invoice']), 'CLAW-00000001.pdf');

    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    // Revoking synchronously raced the download on mobile browsers.
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:invoice');
    expect(document.querySelector('a[download="CLAW-00000001.pdf"]')).toBeNull();
  });

  it('adds the extension from the blob type when the name has none', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    let savedAs = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      savedAs = this.download;
    });

    saveBlobDownload(new Blob(['%PDF'], { type: 'application/pdf' }), 'report');

    expect(savedAs).toBe('report.pdf');
  });
});
