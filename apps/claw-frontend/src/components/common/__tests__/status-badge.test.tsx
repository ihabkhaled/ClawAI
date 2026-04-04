import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/common/status-badge';

describe('StatusBadge', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('applies active status styles', () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByText('active');
    expect(badge.className).toContain('bg-emerald-100');
  });

  it('applies error status styles', () => {
    render(<StatusBadge status="error" />);
    const badge = screen.getByText('error');
    expect(badge.className).toContain('bg-red-100');
  });

  it('applies pending status styles', () => {
    render(<StatusBadge status="pending" />);
    const badge = screen.getByText('pending');
    expect(badge.className).toContain('bg-amber-100');
  });

  it('falls back to inactive styles for unknown status', () => {
    render(<StatusBadge status="unknown-status" />);
    const badge = screen.getByText('unknown-status');
    expect(badge.className).toContain('bg-slate-100');
  });

  it('applies the capitalize class', () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByText('active');
    expect(badge.className).toContain('capitalize');
  });

  it('applies additional className when provided', () => {
    render(<StatusBadge status="active" className="ml-2" />);
    const badge = screen.getByText('active');
    expect(badge.className).toContain('ml-2');
  });

  it('renders inactive status styles', () => {
    render(<StatusBadge status="inactive" />);
    const badge = screen.getByText('inactive');
    expect(badge.className).toContain('bg-slate-100');
  });
});
