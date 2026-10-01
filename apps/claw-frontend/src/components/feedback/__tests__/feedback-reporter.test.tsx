import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackReporter } from '@/components/feedback/feedback-reporter';
import { useFeedbackDialogStore } from '@/stores/feedback-dialog.store';

vi.mock('@/components/feedback/feedback-dialog', () => ({
  FeedbackDialog: ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => (
    <button type="button" data-testid="dialog" onClick={() => onOpenChange(false)} />
  ),
}));

describe('FeedbackReporter', () => {
  beforeEach(() => {
    useFeedbackDialogStore.setState({ isOpen: false });
  });

  it('renders nothing while closed', () => {
    render(<FeedbackReporter />);

    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('shows the dialog once the store opens', () => {
    render(<FeedbackReporter />);

    act(() => useFeedbackDialogStore.getState().openFeedback());

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('hides the dialog when it asks to close', () => {
    useFeedbackDialogStore.setState({ isOpen: true });
    render(<FeedbackReporter />);

    act(() => screen.getByTestId('dialog').click());

    expect(screen.queryByTestId('dialog')).toBeNull();
    expect(useFeedbackDialogStore.getState().isOpen).toBe(false);
  });
});
