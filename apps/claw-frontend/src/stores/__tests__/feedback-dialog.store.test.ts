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

describe('feedback dialog store focus return', () => {
  beforeEach(() => {
    useFeedbackDialogStore.setState({ isOpen: false, returnFocusTo: null });
    document.body.innerHTML = '<button id="opener">Send feedback</button>';
  });

  it('remembers the focused element on open and refocuses it after close', async () => {
    const opener = document.getElementById('opener');
    opener?.focus();

    state().openFeedback();
    expect(state().returnFocusTo).toBe(opener);

    (document.activeElement as HTMLElement).blur();
    state().setFeedbackOpen(false);
    expect(state().returnFocusTo).toBeNull();
    await new Promise<void>((resolve) => setTimeout(resolve, 60));

    expect(document.activeElement).toBe(opener);
  });

  it('closes cleanly when the opener is gone', async () => {
    document.getElementById('opener')?.focus();
    state().openFeedback();
    document.body.innerHTML = '';

    state().setFeedbackOpen(false);
    await new Promise<void>((resolve) => setTimeout(resolve, 60));

    expect(state().isOpen).toBe(false);
  });
});
