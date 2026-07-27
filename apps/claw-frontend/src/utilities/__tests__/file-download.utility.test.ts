import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveBlobDownload } from '@/utilities/file-download.utility';

describe('saveBlobDownload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses a temporary object URL and revokes it after the browser click', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:invoice');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    saveBlobDownload(new Blob(['invoice']), 'CLAW-00000001.pdf');

    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:invoice');
    expect(document.querySelector('a[download="CLAW-00000001.pdf"]')).toBeNull();
  });
});
