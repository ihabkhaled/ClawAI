import type { PluginMentionView } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';
import { usePluginMentionSelection } from '@/hooks/chat/use-plugin-mention-selection';
import type { UsePluginMentionSelectionReturn } from '@/types/plugin-mention.types';

const mentionsApi = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${Object.values(params).join(',')}`,
  }),
}));
vi.mock('@/repositories/plugins/plugin-installs.repository', () => ({
  pluginInstallsRepository: { mentions: () => mentionsApi.list() },
}));

const PLUGINS: PluginMentionView[] = [
  { installId: 'i-web', slug: 'web-fetch', name: 'Web fetch', iconKey: 'globe', enabled: true },
  { installId: 'i-weather', slug: 'weather', name: 'Weather', iconKey: 'cloud', enabled: true },
  { installId: 'i-off', slug: 'off', name: 'Switched off', iconKey: 'globe', enabled: false },
];

let latestSelection: UsePluginMentionSelectionReturn | undefined;

function Harness(props: {
  initialValue?: string;
  onSubmit?: () => void;
  disabled?: boolean;
  withMentions?: boolean;
}): ReactElement {
  const [value, setValue] = useState(props.initialValue ?? '');
  const selection = usePluginMentionSelection({ value, onValueChange: setValue });
  latestSelection = selection;
  return (
    <RichPromptTextarea
      value={value}
      onChange={setValue}
      onSubmit={props.onSubmit}
      ariaLabel="prompt"
      disabled={props.disabled}
      pluginMentions={props.withMentions === false ? undefined : selection}
    />
  );
}

function renderHarness(props: Parameters<typeof Harness>[0] = {}): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness {...props} />
    </QueryClientProvider>,
  );
}

/** Types into the textarea the way a browser does: value and caret move together. */
function type(textarea: HTMLTextAreaElement, text: string): void {
  fireEvent.change(textarea, {
    target: { value: text, selectionStart: text.length, selectionEnd: text.length },
  });
  textarea.setSelectionRange(text.length, text.length);
  fireEvent.keyUp(textarea, { key: text.at(-1) ?? '' });
}

async function openPicker(text = '@'): Promise<HTMLTextAreaElement> {
  const textarea = screen.getByLabelText('prompt') as HTMLTextAreaElement;
  type(textarea, text);
  await screen.findByRole('listbox', { name: 'pluginChat.mention.listLabel' });
  return textarea;
}

describe('RichPromptTextarea — @ plugin picker', () => {
  beforeEach(() => {
    mentionsApi.list.mockReset();
    mentionsApi.list.mockResolvedValue(PLUGINS);
    latestSelection = undefined;
  });

  it('opens a combobox of the installed, enabled plugins when the user types @', async () => {
    renderHarness();
    const textarea = await openPicker();

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      expect.stringContaining('Web fetch'),
      expect.stringContaining('Weather'),
    ]);
    expect(textarea).toHaveAttribute('role', 'combobox');
    expect(textarea).toHaveAttribute('aria-expanded', 'true');
    expect(textarea).toHaveAttribute('aria-autocomplete', 'list');
    expect(textarea).toHaveAttribute('aria-haspopup', 'listbox');
    const listbox = screen.getByRole('listbox');
    expect(textarea).toHaveAttribute('aria-controls', listbox.id);
    // The first row is active from the start; the textarea keeps focus and says which one.
    const [first] = screen.getAllByRole('option');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(textarea).toHaveAttribute('aria-activedescendant', first?.id);
    expect(screen.getByRole('status')).toHaveTextContent('pluginChat.mention.count:2');
  });

  it('never fetches the list until an @ is typed', async () => {
    renderHarness();
    const textarea = screen.getByLabelText('prompt') as HTMLTextAreaElement;
    type(textarea, 'plain text');
    expect(mentionsApi.list).not.toHaveBeenCalled();
    await openPicker('plain text @');
    expect(mentionsApi.list).toHaveBeenCalledTimes(1);
  });

  it('filters while the user keeps typing', async () => {
    renderHarness();
    const textarea = await openPicker();
    type(textarea, '@wea');
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1);
    });
    expect(screen.getByRole('option')).toHaveTextContent('Weather');
  });

  it('moves the active row with ArrowDown and ArrowUp, wrapping round', async () => {
    renderHarness();
    const textarea = await openPicker();
    const rows = screen.getAllByRole('option');

    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    expect(rows[1]).toHaveAttribute('aria-selected', 'true');
    expect(textarea).toHaveAttribute('aria-activedescendant', rows[1]?.id);
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    expect(rows[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(textarea, { key: 'ArrowUp' });
    expect(rows[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('Enter picks the active plugin: @Name goes into the text, a chip appears, nothing is sent', async () => {
    const onSubmit = vi.fn();
    renderHarness({ onSubmit });
    const textarea = await openPicker('look at @');
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea.value).toBe('look at @Weather ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-expanded', 'false');
    const chips = screen.getByRole('list', { name: 'pluginChat.mention.chipsLabel' });
    expect(chips).toHaveTextContent('Weather');
    expect(latestSelection?.payload).toEqual({
      pluginRefs: [{ installId: 'i-weather', label: 'Weather' }],
    });
  });

  it('Tab picks too, and Shift+Enter is left alone', async () => {
    const onSubmit = vi.fn();
    renderHarness({ onSubmit });
    const textarea = await openPicker();

    expect(fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })).toBe(true);
    expect(textarea.value).toBe('@');

    fireEvent.keyDown(textarea, { key: 'Tab' });
    expect(textarea.value).toBe('@Web fetch ');
  });

  it('clicking a row picks it without taking focus from the textarea', async () => {
    renderHarness();
    const textarea = await openPicker();
    const [first] = screen.getAllByRole('option');
    expect(fireEvent.mouseDown(first as HTMLElement)).toBe(false);
    fireEvent.click(first as HTMLElement);

    expect(textarea.value).toBe('@Web fetch ');
  });

  it('Escape closes the picker and keeps the text', async () => {
    renderHarness();
    const textarea = await openPicker('hi @we');
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(textarea.value).toBe('hi @we');
    expect(textarea).toHaveAttribute('aria-expanded', 'false');
    // Further typing in the same token does not reopen it.
    type(textarea, 'hi @wea');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('leaves Enter alone when the picker is closed: it still sends', () => {
    const onSubmit = vi.fn();
    renderHarness({ initialValue: 'hello', onSubmit });
    fireEvent.keyDown(screen.getByLabelText('prompt'), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not open for an email address or an @ inside a word', async () => {
    renderHarness();
    const textarea = screen.getByLabelText('prompt') as HTMLTextAreaElement;
    type(textarea, 'mail me@host');
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(mentionsApi.list).not.toHaveBeenCalled();
  });

  it('stays closed when nothing matches, so @ stays an ordinary character', async () => {
    renderHarness();
    const textarea = await openPicker();
    type(textarea, '@zzz');
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
    expect(textarea).toHaveAttribute('aria-expanded', 'false');
  });

  it('never opens for a user whose plugin list cannot be read', async () => {
    mentionsApi.list.mockRejectedValue(new Error('403'));
    renderHarness();
    const textarea = screen.getByLabelText('prompt') as HTMLTextAreaElement;
    type(textarea, '@');
    await waitFor(() => {
      expect(mentionsApi.list).toHaveBeenCalled();
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not swallow Enter or Tab during IME composition, and re-evaluates when it ends', async () => {
    const onSubmit = vi.fn();
    renderHarness({ onSubmit });
    const textarea = await openPicker();

    fireEvent.compositionStart(textarea);
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
    fireEvent.keyDown(textarea, { key: 'Tab', isComposing: true });
    expect(textarea.value).toBe('@');

    fireEvent.compositionEnd(textarea);
    await screen.findByRole('listbox');
  });

  it('offers a plugin once only: a chosen one is not listed again', async () => {
    renderHarness();
    const textarea = await openPicker();
    fireEvent.keyDown(textarea, { key: 'Enter' });
    type(textarea, '@Web fetch @');
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1);
    });
    expect(screen.getByRole('option')).toHaveTextContent('Weather');
  });

  it('removing a chip removes its @Name from the text', async () => {
    renderHarness();
    const textarea = await openPicker('see @');
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(textarea.value).toBe('see @Web fetch ');

    fireEvent.click(
      screen.getByRole('button', { name: 'pluginChat.mention.removeChip:Web fetch' }),
    );
    expect(textarea.value).toBe('see ');
    expect(
      screen.queryByRole('list', { name: 'pluginChat.mention.chipsLabel' }),
    ).not.toBeInTheDocument();
  });

  it('drops a chip when the user deletes its @Name by hand', async () => {
    renderHarness();
    const textarea = await openPicker();
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(latestSelection?.refs).toHaveLength(1);

    type(textarea, '');
    expect(latestSelection?.refs).toEqual([]);
  });

  it('adds no combobox semantics and no list when the composer has no mention support', () => {
    renderHarness({ withMentions: false });
    const textarea = screen.getByLabelText('prompt');
    expect(textarea).not.toHaveAttribute('role');
    expect(textarea).not.toHaveAttribute('aria-expanded');
    type(textarea as HTMLTextAreaElement, '@');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(mentionsApi.list).not.toHaveBeenCalled();
  });

  it('is inert while the textarea is disabled', () => {
    renderHarness({ disabled: true });
    const textarea = screen.getByLabelText('prompt') as HTMLTextAreaElement;
    expect(textarea).not.toHaveAttribute('role', 'combobox');
    type(textarea, '@');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(mentionsApi.list).not.toHaveBeenCalled();
  });
});
