import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRouteErrorBoundary } from '../use-route-error-boundary';

const pathnameMock = vi.fn<() => string>();
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const errorMock = vi.fn();
vi.mock('@/utilities/logger.utility', () => ({
  logger: { error: (...args: unknown[]) => errorMock(...args) },
}));

describe('useRouteErrorBoundary', () => {
  beforeEach(() => {
    pathnameMock.mockReset();
    errorMock.mockReset();
  });

  const err = Object.assign(new Error('boom'), { digest: 'abc' });

  it('does NOT reset on initial render (same pathname)', () => {
    pathnameMock.mockReturnValue('/memory');
    const reset = vi.fn();
    renderHook(() => useRouteErrorBoundary({ error: err, reset }));
    expect(reset).not.toHaveBeenCalled();
  });

  it('logs the error exactly once', () => {
    pathnameMock.mockReturnValue('/memory');
    const reset = vi.fn();
    const { rerender } = renderHook(() => useRouteErrorBoundary({ error: err, reset }));
    rerender();
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(errorMock.mock.calls[0]?.[0]).toMatchObject({
      component: 'RouteErrorBoundary',
      message: 'boom',
    });
  });

  it('resets when the pathname changes (navigation clears the error)', () => {
    pathnameMock.mockReturnValue('/memory');
    const reset = vi.fn();
    const { rerender } = renderHook(() => useRouteErrorBoundary({ error: err, reset }));
    expect(reset).not.toHaveBeenCalled();

    pathnameMock.mockReturnValue('/chat');
    rerender();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('returns i18n keys + reset as the retry handler', () => {
    pathnameMock.mockReturnValue('/memory');
    const reset = vi.fn();
    const { result } = renderHook(() => useRouteErrorBoundary({ error: err, reset }));
    expect(result.current.title).toBe('common.errorBoundaryTitle');
    expect(result.current.description).toBe('common.errorBoundaryDescription');
    expect(result.current.retryLabel).toBe('common.retry');
    result.current.onRetry();
    expect(reset).toHaveBeenCalled();
  });
});
