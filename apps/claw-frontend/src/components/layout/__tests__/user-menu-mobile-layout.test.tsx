import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserMenu } from '@/components/layout/user-menu';

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: { username: 'claw-admin', email: 'admin@claw.local' } }),
}));
vi.mock('@/hooks/auth/use-logout', () => ({
  useLogout: () => ({ logout: vi.fn(), isPending: false }),
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('UserMenu mobile layout', () => {
  it('keeps the avatar trigger at least 44px wide and high', () => {
    render(<UserMenu />);

    expect(screen.getByRole('button')).toHaveClass('min-h-11', 'min-w-11');
  });
});
