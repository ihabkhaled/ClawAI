import { render, screen } from '@testing-library/react';
import { Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { ContextPackListGrid } from '@/components/context-packs/context-pack-list-grid';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { DashboardQuickActionCard } from '@/components/dashboard/dashboard-quick-action-card';
import { DashboardGreetingKey, DashboardOperationalState } from '@/enums';
import type { ContextPack } from '@/types';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * Beside the 256px sidebar a 768px tablet gives the page ~512px. These contracts keep titles
 * wrapping instead of being ellipsised to a few pixels, and keep card columns tied to the width of
 * their own block (container queries), not to the window.
 */
const PACK: ContextPack = {
  id: 'p1',
  userId: 'u1',
  name: 'Pack',
  description: null,
  scope: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('narrow content area layout contracts', () => {
  it('lets the dashboard headline wrap instead of truncating', () => {
    render(
      <DashboardHero
        greetingKey={DashboardGreetingKey.AFTERNOON}
        greetingName="claw-admin"
        operationalState={DashboardOperationalState.OPERATIONAL}
      />,
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).not.toHaveClass('truncate');
    expect(heading.className).toContain('[overflow-wrap:anywhere]');
  });

  it('lets a quick-action title wrap instead of truncating', () => {
    render(
      <DashboardQuickActionCard
        action={{
          href: '/chat',
          icon: Plus,
          label: 'dashboard.newChat',
          description: 'dashboard.newChatDesc',
        }}
      />,
    );
    const title = screen.getByText('dashboard.newChat');
    expect(title).not.toHaveClass('truncate');
  });

  it('sizes context pack columns from the container, not the viewport', () => {
    const { container } = render(<ContextPackListGrid packs={[PACK]} onSelectPack={() => {}} />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('@container');
    const grid = wrapper?.firstElementChild;
    expect(grid?.className).toContain('@lg:grid-cols-2');
    expect(grid?.className).toContain('@4xl:grid-cols-3');
    expect(grid?.className).not.toMatch(/(^|\s)(sm|md|lg):grid-cols/);
  });
});
