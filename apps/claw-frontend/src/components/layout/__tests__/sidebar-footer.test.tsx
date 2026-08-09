import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Sidebar } from '@/components/layout/sidebar';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
  }),
}));
vi.mock('@/hooks/layout/use-sidebar-controller', () => ({
  useSidebarController: () => ({ isOpen: true, close: vi.fn(), items: [] }),
}));
vi.mock('@/components/layout/gpu-badge', () => ({
  GpuBadge: () => <span data-testid="gpu-badge">cpu-only</span>,
}));
vi.mock('@/components/layout/sidebar-nav-item', () => ({
  SidebarNavItem: () => <li data-testid="nav-item" />,
}));

describe('Sidebar footer (mobile bottom-nav overlap)', () => {
  // Regression: on mobile the sidebar is a bottom sheet pinned to bottom-0 and
  // the mobile bottom nav is fixed at bottom-0 with the SAME z-50. The nav
  // painted over this row, hiding the version pill and the CPU/GPU badge.
  it('reserves space for the mobile bottom nav under the footer row', () => {
    render(<Sidebar />);

    const badge = screen.getByTestId('gpu-badge');
    const footer = badge.closest('div');

    expect(footer).not.toBeNull();
    expect(footer?.className).toContain('safe-bottom');
    expect(footer?.className).toContain('safe-bottom-base-nav');
  });

  it('keeps the version pill and the GPU badge on screen together', () => {
    render(<Sidebar />);

    expect(screen.getByTestId('gpu-badge')).toBeInTheDocument();
    expect(screen.getByText(/common\.brandVersion/)).toBeInTheDocument();
  });
});
