import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAdSenseScript } from '../use-adsense-script';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: (): string => mockPathname,
}));

describe('useAdSenseScript', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockPathname = '/';
  });

  it('resolves shouldLoad from the real pathname on an eligible page', () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SERVING_ENABLED', 'true');
    mockPathname = '/';

    const { result } = renderHook(() => useAdSenseScript());

    expect(result.current.shouldLoad).toBe(true);
    expect(result.current.clientId).toBe('ca-pub-2415314275784926');
  });

  it('resolves shouldLoad to false on an ineligible page even when serving is enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SERVING_ENABLED', 'true');
    mockPathname = '/chat';

    const { result } = renderHook(() => useAdSenseScript());

    expect(result.current.shouldLoad).toBe(false);
  });

  it('resolves shouldLoad to false on a shared-chat page even in review mode', () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-2415314275784926');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_REVIEW_MODE', 'true');
    mockPathname = '/en/share/chat/AbCdEfGhIjKlMnOpQrStUv';

    const { result } = renderHook(() => useAdSenseScript());

    expect(result.current.shouldLoad).toBe(false);
  });
});
