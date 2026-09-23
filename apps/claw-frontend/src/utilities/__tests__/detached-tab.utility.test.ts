import { afterEach, describe, expect, it, vi } from 'vitest';

import { openDetachedTab } from '@/utilities/detached-tab.utility';

describe('openDetachedTab', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens an empty tab and cuts its link back to this page', () => {
    const opened = { opener: window } as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(opened);

    expect(openDetachedTab()).toBe(opened);
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(opened.opener).toBeNull();
  });

  it('returns null when the browser blocks the tab', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(openDetachedTab()).toBeNull();
  });
});
