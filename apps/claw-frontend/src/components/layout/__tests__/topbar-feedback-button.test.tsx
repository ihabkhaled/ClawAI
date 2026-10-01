import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TopbarFeedbackButton } from '@/components/layout/topbar-feedback-button';
import { useFeedbackDialogStore } from '@/stores/feedback-dialog.store';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('TopbarFeedbackButton', () => {
  beforeEach(() => {
    useFeedbackDialogStore.setState({ isOpen: false });
  });

  it('has an accessible name and a tooltip', () => {
    render(<TopbarFeedbackButton />);

    const button = screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' });
    expect(button).toHaveAttribute('title', 'feedback.launcher.tooltip');
  });

  it('opens the feedback dialog on click', async () => {
    const user = userEvent.setup();
    render(<TopbarFeedbackButton />);

    await user.click(screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' }));

    expect(useFeedbackDialogStore.getState().isOpen).toBe(true);
  });
});
