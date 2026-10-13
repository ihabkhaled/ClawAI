import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThreadLiveBanner } from '../thread-live-banner';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ThreadLiveBanner Board link', () => {
  it('offers the public Thread and the Board reader side by side', () => {
    render(<ThreadLiveBanner url="https://claw.local/threads/clear-writing" />);

    expect(screen.getByRole('link', { name: 'chat.threadLiveOpen' })).toHaveAttribute(
      'href',
      'https://claw.local/threads/clear-writing',
    );
    expect(screen.getByRole('link', { name: 'chat.threadBoardViewOnBoard' })).toHaveAttribute(
      'href',
      '/board/clear-writing',
    );
  });

  it('hides the Board link when the address has no slug', () => {
    render(<ThreadLiveBanner url="https://claw.local/elsewhere" />);

    expect(screen.queryByRole('link', { name: 'chat.threadBoardViewOnBoard' })).toBeNull();
  });
});
