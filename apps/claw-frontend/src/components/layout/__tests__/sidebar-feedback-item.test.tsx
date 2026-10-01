import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarFeedbackItem } from '@/components/layout/sidebar-feedback-item';
import { useFeedbackDialogStore } from '@/stores/feedback-dialog.store';
import { useSidebarStore } from '@/stores/sidebar.store';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('SidebarFeedbackItem', () => {
  beforeEach(() => {
    useFeedbackDialogStore.setState({ isOpen: false });
    useSidebarStore.setState({ isOpen: true });
  });

  it('renders a labelled button', () => {
    render(<SidebarFeedbackItem />);

    expect(screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' })).toBeInTheDocument();
  });

  it('opens the feedback dialog and closes the drawer on click', async () => {
    const user = userEvent.setup();
    render(<SidebarFeedbackItem />);

    await user.click(screen.getByRole('button', { name: 'feedback.launcher.ariaLabel' }));

    expect(useFeedbackDialogStore.getState().isOpen).toBe(true);
    expect(useSidebarStore.getState().isOpen).toBe(false);
  });

  it('opens from the keyboard', async () => {
    const user = userEvent.setup();
    render(<SidebarFeedbackItem />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(useFeedbackDialogStore.getState().isOpen).toBe(true);
  });
});
