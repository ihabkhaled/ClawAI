import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PreviewContextDialog } from '@/components/chat/preview-context-dialog';

const mutate = vi.fn();
let state: Record<string, unknown> = {};

vi.mock('@/hooks/chat/use-preview-context', () => ({
  usePreviewContext: () => ({ mutate, ...state }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values === undefined ? key : `${key}:${Object.values(values).join('/')}`,
  }),
}));

const renderDialog = (open: boolean): void => {
  render(<PreviewContextDialog threadId="t1" draft="hi" open={open} onOpenChange={vi.fn()} />);
};

describe('PreviewContextDialog', () => {
  beforeEach(() => {
    mutate.mockReset();
    state = { isPending: false, isError: false, data: undefined };
  });

  it('asks for a fresh dry-run of the draft each time it opens', () => {
    renderDialog(true);

    expect(mutate).toHaveBeenCalledWith({ draft: 'hi' });
  });

  it('does not ask while closed', () => {
    renderDialog(false);

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows loading and failure states', () => {
    state = { isPending: true, isError: false, data: undefined };
    renderDialog(true);
    expect(screen.getByText('preview.loading')).toBeInTheDocument();
  });

  it('shows the error message when the dry-run fails', () => {
    state = { isPending: false, isError: true, data: undefined };
    renderDialog(true);
    expect(screen.getByText('preview.failed')).toBeInTheDocument();
  });

  it('lists memories, pack items and warnings', () => {
    state = {
      isPending: false,
      isError: false,
      data: {
        memories: [
          { id: 'm1', content: 'likes tea' },
          { id: 'm2', content: null },
        ],
        packItems: [{ id: 'p1', content: 'pack text' }],
        warnings: ['over budget', 'stale'],
        tokenBudgetUsed: 10,
        tokenBudget: 100,
      },
    };
    renderDialog(true);

    expect(screen.getByText('likes tea')).toBeInTheDocument();
    expect(screen.getByText('preview.redactedPlaceholder')).toBeInTheDocument();
    expect(screen.getByText('pack text')).toBeInTheDocument();
    expect(screen.getByText('over budget; stale')).toBeInTheDocument();
    expect(screen.getByText('preview.tokenBudget:10/100')).toBeInTheDocument();
  });

  it('says so when nothing would be sent', () => {
    state = {
      isPending: false,
      isError: false,
      data: { memories: [], packItems: [], warnings: [], tokenBudgetUsed: 0, tokenBudget: 100 },
    };
    renderDialog(true);

    expect(screen.getByText('preview.empty')).toBeInTheDocument();
  });
});
