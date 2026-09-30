import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PromptLibraryDialog } from '@/components/chat/prompt-library/prompt-library-dialog';
import { PromptLibraryView } from '@/enums/prompt-library.enum';
import type { PromptLibraryDialogProps, PromptTemplate } from '@/types';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const TEMPLATE: PromptTemplate = {
  id: 'p1',
  title: 'Weekly report',
  body: 'Report for {{team}}',
  tags: ['work'],
  isFavorite: true,
  usageCount: 2,
  lastUsedAt: null,
  variables: ['team'],
};

function props(overrides: Partial<PromptLibraryDialogProps> = {}): PromptLibraryDialogProps {
  return {
    isOpen: true,
    onOpenChange: vi.fn(),
    view: PromptLibraryView.List,
    filters: { q: '', tag: null, favoriteOnly: false },
    onFiltersChange: vi.fn(),
    templates: [],
    availableTags: [],
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    onLoadMore: vi.fn(),
    onChoose: vi.fn(),
    onToggleFavorite: vi.fn(),
    onStartCreate: vi.fn(),
    onStartEdit: vi.fn(),
    pendingDeleteId: null,
    onRequestDelete: vi.fn(),
    onConfirmDelete: vi.fn(),
    editing: null,
    isSaving: false,
    onSave: vi.fn(),
    filling: null,
    onSubmitFill: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
}

describe('PromptLibraryDialog', () => {
  it('shows the empty state', () => {
    render(<PromptLibraryDialog {...props()} />);
    expect(screen.getByText('promptLibrary.empty')).toBeTruthy();
  });

  it('shows the filtered-empty message when a filter is active', () => {
    const filters = { q: 'zzz', tag: null, favoriteOnly: false };
    render(<PromptLibraryDialog {...props({ filters })} />);
    expect(screen.getByText('promptLibrary.emptyFiltered')).toBeTruthy();
  });

  it('lists templates and reports choose and filter events', () => {
    const p = props({ templates: [TEMPLATE], availableTags: ['work'] });
    render(<PromptLibraryDialog {...p} />);
    fireEvent.click(screen.getByText('Weekly report'));
    expect(p.onChoose).toHaveBeenCalledWith(TEMPLATE);
    fireEvent.click(screen.getAllByRole('button', { name: 'work' })[0] as HTMLElement);
    expect(p.onFiltersChange).toHaveBeenCalledWith({ q: '', tag: 'work', favoriteOnly: false });
    fireEvent.change(screen.getByLabelText('promptLibrary.searchLabel'), {
      target: { value: 'rep' },
    });
    expect(p.onFiltersChange).toHaveBeenCalledWith({ q: 'rep', tag: null, favoriteOnly: false });
  });

  it('asks for confirmation inside the dialog before deleting', () => {
    const p = props({ templates: [TEMPLATE], pendingDeleteId: 'p1' });
    render(<PromptLibraryDialog {...p} />);
    expect(screen.getByText('promptLibrary.deleteConfirm')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'promptLibrary.deleteAction' }));
    expect(p.onConfirmDelete).toHaveBeenCalledWith('p1');
  });

  it('renders the fill step and submits the entered values', () => {
    const p = props({ view: PromptLibraryView.Fill, filling: TEMPLATE });
    render(<PromptLibraryDialog {...p} />);
    const insert = screen.getByRole('button', { name: 'promptLibrary.insert' });
    expect((insert as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('team'), { target: { value: 'Platform' } });
    expect((insert as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(insert);
    expect(p.onSubmitFill).toHaveBeenCalledWith({ team: 'Platform' });
  });

  it('saves the create form only once title and body are present', () => {
    const p = props({ view: PromptLibraryView.Form });
    render(<PromptLibraryDialog {...p} />);
    const save = screen.getByRole('button', { name: 'promptLibrary.save' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('promptLibrary.titleLabel'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('promptLibrary.bodyLabel'), { target: { value: 'B' } });
    fireEvent.click(save);
    expect(p.onSave).toHaveBeenCalledWith({ title: 'T', body: 'B', tags: '' });
  });
});
