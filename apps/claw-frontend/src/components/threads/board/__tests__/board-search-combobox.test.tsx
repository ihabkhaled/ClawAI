import { ThreadPublicationType } from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BoardSuggestResult } from '@/types/thread-board-search.types';

import { BoardSearchCombobox } from '../board-search-combobox';

const push = vi.fn();
let suggestState: BoardSuggestResult;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}|${Object.values(params).join(',')}` : key,
  }),
}));
vi.mock('@/hooks/threads/board/use-board-suggest', () => ({
  useBoardSuggest: () => suggestState,
}));

const item = (slug: string, title: string, match: [number, number][] = []) => ({
  slug,
  title,
  publicationType: ThreadPublicationType.ARTICLE,
  contentLocale: 'ar',
  publishedAt: '2026-01-02T00:00:00Z',
  match,
});

function setup(value = '') {
  const onSubmit = vi.fn();
  render(<BoardSearchCombobox value={value} onSubmit={onSubmit} />);
  return { onSubmit, input: screen.getByRole('combobox') };
}

describe('BoardSearchCombobox', () => {
  beforeEach(() => {
    push.mockClear();
    suggestState = {
      suggestions: [item('one', 'Alpha beta', [[0, 5]]), item('two', 'مرحبا', [[0, 2]])],
      didYouMean: null,
      total: 2,
      totalCapped: false,
      isLoading: false,
      isError: false,
    };
  });

  it('exposes combobox a11y attributes and a live count', async () => {
    const { input } = setup();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await userEvent.type(input, 'al');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('listbox');
    expect(input).toHaveAttribute('aria-controls', list.id);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('status')).toHaveTextContent('chat.threadBoardResultsCount|2');
    await userEvent.keyboard('{ArrowDown}');
    const first = screen.getAllByRole('option')[0];
    expect(input).toHaveAttribute('aria-activedescendant', first?.id);
    expect(first).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights matched characters in <mark>, including RTL', async () => {
    const { input } = setup();
    await userEvent.type(input, 'al');
    const marks = Array.from(document.querySelectorAll('mark')).map((m) => m.textContent);
    expect(marks).toEqual(['Alpha', 'مر']);
  });

  it('keyboard: arrows + Enter open a suggestion', async () => {
    const { input } = setup();
    await userEvent.type(input, 'al');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(push).toHaveBeenCalledWith('/board/two');
  });

  it('keyboard: Enter with no active option submits the typed query', async () => {
    const { input, onSubmit } = setup();
    await userEvent.type(input, 'alp{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('alp');
    expect(push).not.toHaveBeenCalled();
  });

  it('keyboard: Escape closes the panel', async () => {
    const { input } = setup();
    await userEvent.type(input, 'al');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('click outside closes the panel', async () => {
    const { input } = setup();
    await userEvent.type(input, 'al');
    await userEvent.click(document.body);
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not open below two characters', async () => {
    const { input } = setup();
    await userEvent.type(input, 'a');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('show-all label uses the capped total and submits the query', async () => {
    suggestState = { ...suggestState, total: 100, totalCapped: true };
    const { input, onSubmit } = setup();
    await userEvent.type(input, 'al');
    await userEvent.click(screen.getByText('chat.threadBoardShowAll|100+'));
    expect(onSubmit).toHaveBeenCalledWith('al');
  });

  it('did-you-mean fills and submits the corrected term', async () => {
    suggestState = { ...suggestState, didYouMean: 'alpha' };
    const { input, onSubmit } = setup();
    await userEvent.type(input, 'alpa');
    await userEvent.click(screen.getByText('chat.threadBoardDidYouMean|alpha'));
    expect(onSubmit).toHaveBeenCalledWith('alpha');
    expect(input).toHaveValue('alpha');
  });

  it('clicking a suggestion navigates to /board/<slug>', async () => {
    const { input } = setup();
    await userEvent.type(input, 'al');
    await userEvent.click(screen.getAllByRole('option')[0] as HTMLElement);
    expect(push).toHaveBeenCalledWith('/board/one');
  });

  it('clear button empties and submits an empty query', async () => {
    const { input, onSubmit } = setup('hello');
    await userEvent.click(screen.getByRole('button', { name: 'chat.threadBoardClearFilters' }));
    expect(input).toHaveValue('');
    expect(onSubmit).toHaveBeenCalledWith('');
  });

  it('shows the loading state', async () => {
    suggestState = { ...suggestState, suggestions: [], total: 0, isLoading: true };
    const { input } = setup();
    await userEvent.type(input, 'al');
    expect(screen.getByTestId('board-suggest-loading')).toBeInTheDocument();
  });

  it('shows the error state', async () => {
    suggestState = { ...suggestState, suggestions: [], total: 0, isError: true };
    const { input } = setup();
    await userEvent.type(input, 'al');
    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadBoardErrorTitle');
  });

  it('shows the no-results state', async () => {
    suggestState = { ...suggestState, suggestions: [], total: 0 };
    const { input } = setup();
    await userEvent.type(input, 'al');
    expect(screen.getByText('chat.threadBoardNoSuggestions')).toBeInTheDocument();
  });

  it('renders a title containing <script> as inert text', async () => {
    suggestState = {
      ...suggestState,
      suggestions: [item('x', '<script>alert(1)</script>', [[0, 8]])],
      total: 1,
    };
    const { input } = setup();
    await userEvent.type(input, 'sc');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>')).toBeInTheDocument();
  });
});
