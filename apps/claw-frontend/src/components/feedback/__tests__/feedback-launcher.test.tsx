import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackLauncher } from '@/components/feedback/feedback-launcher';
import { FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY } from '@/constants/feedback.constants';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/feedback/use-feedback-launcher', () => ({
  useFeedbackLauncher: () => ({ launcherRef: { current: null } }),
}));

describe('FeedbackLauncher', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the open button and a hide control when expanded', () => {
    render(<FeedbackLauncher onOpen={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'feedback.launcher.hideAriaLabel' }),
    ).toBeInTheDocument();
  });

  it('collapses to a single edge tab after the hide control is clicked', async () => {
    const user = userEvent.setup();
    render(<FeedbackLauncher onOpen={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'feedback.launcher.hideAriaLabel' }));

    expect(
      screen.getByRole('button', { name: 'feedback.launcher.showAriaLabel' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'feedback.launcher.ariaLabel' })).toBeNull();
  });

  it('restores the full launcher when the edge tab is clicked', async () => {
    const user = userEvent.setup();
    render(<FeedbackLauncher onOpen={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'feedback.launcher.hideAriaLabel' }));
    await user.click(screen.getByRole('button', { name: 'feedback.launcher.showAriaLabel' }));

    expect(screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' })).toBeInTheDocument();
  });

  it('remembers a collapsed state across remounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<FeedbackLauncher onOpen={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'feedback.launcher.hideAriaLabel' }));
    expect(window.localStorage.getItem(FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY)).toBe('true');
    unmount();

    render(<FeedbackLauncher onOpen={vi.fn()} />);
    expect(
      await screen.findByRole('button', { name: 'feedback.launcher.showAriaLabel' }),
    ).toBeInTheDocument();
  });

  it('calls onOpen when the main launcher button is clicked', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<FeedbackLauncher onOpen={onOpen} />);

    await user.click(screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
