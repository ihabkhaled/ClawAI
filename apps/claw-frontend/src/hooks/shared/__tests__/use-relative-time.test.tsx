import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRelativeTime } from '@/hooks/shared/use-relative-time';
import { relativeTimeSubscriberCount } from '@/utilities/relative-time-ticker.utility';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    dir: 'ltr',
    t: (key: string) => (key === 'threadTime.justNow' ? 'just now' : key),
  }),
}));

const NOW = new Date('2026-10-14T12:00:00.000Z');

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    setHidden(false);
    vi.useRealTimers();
  });

  it('returns the label, a title and the UTC datetime', () => {
    const { result } = renderHook(() => useRelativeTime('2026-10-14T11:40:00.000Z'));
    expect(result.current.label).toBe('20 minutes ago');
    expect(result.current.dateTime).toBe('2026-10-14T11:40:00.000Z');
    expect(result.current.title.length).toBeGreaterThan(0);
  });

  it('moves from "just now" to minutes as the shared ticker beats', () => {
    const { result } = renderHook(() => useRelativeTime('2026-10-14T11:59:40.000Z'));
    expect(result.current.label).toBe('just now');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.label).toBe('1 minute ago');
  });

  it('uses a single timer for many timestamps and stops it on unmount', () => {
    const a = renderHook(() => useRelativeTime('2026-10-14T11:00:00.000Z'));
    const b = renderHook(() => useRelativeTime('2026-10-13T11:00:00.000Z'));
    expect(relativeTimeSubscriberCount()).toBe(2);
    expect(vi.getTimerCount()).toBe(1);
    a.unmount();
    b.unmount();
    expect(relativeTimeSubscriberCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not update while the tab is hidden, and catches up when visible', () => {
    const { result } = renderHook(() => useRelativeTime('2026-10-14T11:59:40.000Z'));
    setHidden(true);
    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(result.current.label).toBe('just now');
    act(() => {
      setHidden(false);
    });
    expect(result.current.label).toBe('5 minutes ago');
  });

  it('is empty for an invalid value', () => {
    const { result } = renderHook(() => useRelativeTime('garbage'));
    expect(result.current).toEqual({ label: '', title: '', dateTime: '' });
  });
});
