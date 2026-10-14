import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RelativeTime } from '@/components/shared/relative-time';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    dir: 'ltr',
    t: (key: string) => (key === 'threadTime.justNow' ? 'just now' : key),
  }),
}));

describe('RelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders a semantic time element with the UTC instant and a local title', () => {
    render(<RelativeTime value="2026-10-14T10:00:00Z" className="x" />);
    const el = screen.getByTestId('relative-time');
    expect(el.tagName).toBe('TIME');
    expect(el).toHaveAttribute('datetime', '2026-10-14T10:00:00.000Z');
    expect(el).toHaveTextContent('2 hours ago');
    expect(el.getAttribute('title')).toMatch(/2026/);
    expect(el).toHaveClass('x');
  });

  it('renders the stable UTC text on the server, so hydration never mismatches', () => {
    const html = renderToString(<RelativeTime value="2026-10-14T10:00:00Z" />);
    expect(html).toContain('2026-10-14');
    expect(html).toContain('title="2026-10-14 10:00 UTC"');
    expect(html).not.toContain('ago');
  });

  it('renders nothing for an invalid value', () => {
    const { container } = render(<RelativeTime value="nope" />);
    expect(container).toBeEmptyDOMElement();
  });
});
