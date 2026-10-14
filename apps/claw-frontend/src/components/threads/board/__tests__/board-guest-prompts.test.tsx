import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardGuestPrompts } from '../board-guest-prompts';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const SIGN_IN = '/login?returnTo=%2Fthreads%2Fclear-writing';

describe('BoardGuestPrompts', () => {
  it('replaces every account action with a "Sign in to ..." link back to this page', () => {
    render(<BoardGuestPrompts signInHref={SIGN_IN} />);

    const group = screen.getByTestId('board-guest-prompts');
    for (const key of [
      'chat.threadBoardGuestSignInToLike',
      'chat.threadBoardGuestSignInToComment',
      'chat.threadBoardGuestSignInToRequestChange',
      'chat.threadBoardGuestSignInToReport',
    ]) {
      expect(within(group).getByRole('link', { name: key })).toHaveAttribute('href', SIGN_IN);
    }
  });

  it('offers sign-up with the same return address', () => {
    render(<BoardGuestPrompts signInHref={SIGN_IN} />);

    expect(screen.getByRole('link', { name: 'chat.threadBoardGuestRegister' })).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fthreads%2Fclear-writing',
    );
  });

  it('has no working action control, only links', () => {
    render(<BoardGuestPrompts signInHref={SIGN_IN} />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });
});
