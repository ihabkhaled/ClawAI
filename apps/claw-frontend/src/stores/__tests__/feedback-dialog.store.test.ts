import { beforeEach, describe, expect, it } from 'vitest';

import { useFeedbackDialogStore } from '@/stores/feedback-dialog.store';

const state = () => useFeedbackDialogStore.getState();

describe('feedback dialog store', () => {
  beforeEach(() => {
    useFeedbackDialogStore.setState({ isOpen: false });
  });

  it('starts closed', () => {
    expect(state().isOpen).toBe(false);
  });

  it('opens through openFeedback', () => {
    state().openFeedback();

    expect(state().isOpen).toBe(true);
  });

  it('closes through setFeedbackOpen(false)', () => {
    state().openFeedback();
    state().setFeedbackOpen(false);

    expect(state().isOpen).toBe(false);
  });
});
