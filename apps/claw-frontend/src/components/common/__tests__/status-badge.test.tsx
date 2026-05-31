import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StatusBadge } from '@/components/common/status-badge';

// StatusBadge now uses useTranslation() to render a screen-reader category
// prefix ("Success:", "Error:", etc.) so colour alone doesn't carry meaning
// for assistive tech. Mock the hook so these unit tests don't need a full
// LocaleProvider — the i18n key is echoed back as-is, which lets us assert
// both the visible status text AND the sr-only prefix.
vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe('StatusBadge', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('applies active status styles', () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('bg-emerald-100');
  });

  it('applies error status styles', () => {
    const { container } = render(<StatusBadge status="error" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('bg-red-100');
  });

  it('applies pending status styles', () => {
    const { container } = render(<StatusBadge status="pending" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('bg-amber-100');
  });

  it('falls back to inactive styles for unknown status', () => {
    const { container } = render(<StatusBadge status="unknown-status" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('bg-slate-100');
  });

  it('applies the capitalize class', () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('capitalize');
  });

  it('applies additional className when provided', () => {
    const { container } = render(<StatusBadge status="active" className="ml-2" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('ml-2');
  });

  it('renders inactive status styles', () => {
    const { container } = render(<StatusBadge status="inactive" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('bg-slate-100');
  });

  it('renders the screen-reader category prefix', () => {
    render(<StatusBadge status="active" />);
    // sr-only span renders the i18n key (mocked passthrough). The key for
    // "active" is the statusSuccess accessibility entry.
    expect(screen.getByText(/statusSuccess/i)).toBeInTheDocument();
  });
});
