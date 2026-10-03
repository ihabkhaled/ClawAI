import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComposerContextControls } from '@/components/chat/composer-context-controls';
import type {
  UseComposerContextPacksReturn,
  UseComposerContextPreviewReturn,
} from '@/types/composer-context.types';

const toggle = vi.fn();
const onOpenChange = vi.fn();

let picker: UseComposerContextPacksReturn;
let preview: UseComposerContextPreviewReturn;

vi.mock('@/hooks/chat/use-composer-context-packs', () => ({
  useComposerContextPacks: () => picker,
}));
vi.mock('@/hooks/chat/use-composer-context-preview', () => ({
  useComposerContextPreview: () => preview,
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values?.['value'] === undefined ? key : `${key}:${values['value']}`,
  }),
}));

const emptyBundle = {
  memories: [],
  packItems: [],
  warnings: [],
} as unknown as UseComposerContextPreviewReturn['bundle'];

const closedPreview = (): UseComposerContextPreviewReturn => ({
  open: false,
  onOpenChange,
  isLoading: false,
  isError: false,
  bundle: null,
  packGroups: [],
  thread: null,
  useMemory: true,
  useContext: true,
});

const bundleWithMemory = (content: string | null): UseComposerContextPreviewReturn['bundle'] =>
  ({
    memories: [{ id: 'm1', content }],
    packItems: [],
    warnings: [],
  }) as unknown as UseComposerContextPreviewReturn['bundle'];

const packOf = (id: string, name: string, description: string | null) => ({
  id,
  userId: 'u',
  name,
  description,
  scope: null,
  createdAt: '',
  updatedAt: '',
});

const renderControls = (): void => {
  render(<ComposerContextControls threadId="t1" draft="hello" disabled={false} />);
};

const openPicker = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'chat.composerContext.menuLabel' }));
};

const openDialog = (label: string): void => {
  openPicker();
  fireEvent.click(screen.getByRole('button', { name: label }));
};

const VIEW = 'chat.composerContext.viewLabel';
const MEMORY = 'chat.composerContext.memoryLabel';

describe('ComposerContextControls', () => {
  beforeEach(() => {
    toggle.mockReset();
    onOpenChange.mockReset();
    picker = {
      packs: [packOf('p1', 'Trips', 'Paris plan'), packOf('p2', 'ClawAI', null)],
      isLoading: false,
      selectedIds: ['p1'],
      selectedCount: 1,
      atLimit: false,
      isSaving: false,
      toggle,
    };
    preview = closedPreview();
  });

  it('renders ONE always-visible Context button with an accessible name', () => {
    renderControls();

    expect(
      screen.getByRole('button', { name: 'chat.composerContext.menuLabel' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('shows how many packs are attached on the Context button', () => {
    renderControls();

    expect(
      screen.getByRole('button', { name: 'chat.composerContext.menuLabel' }),
    ).toHaveTextContent('1');
  });

  it('offers pick, view and memory inside the menu', () => {
    renderControls();
    openPicker();

    expect(screen.getByText('chat.composerContext.pickLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: VIEW })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: MEMORY })).toBeInTheDocument();
  });

  it('lists every pack with its checked state and toggles on click', () => {
    renderControls();
    openPicker();

    expect(screen.getByRole('checkbox', { name: /Trips/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /ClawAI/ })).not.toBeChecked();
    expect(screen.getByText('chat.composerContext.pickCount:1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /ClawAI/ }));
    expect(toggle).toHaveBeenCalledWith('p2');
  });

  it('says so when there are no packs, and links to manage them', () => {
    picker = { ...picker, packs: [], selectedIds: [], selectedCount: 0 };
    renderControls();
    openPicker();

    expect(screen.getByText('chat.composerContext.pickEmpty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chat.composerContext.pickManage' })).toHaveAttribute(
      'href',
      '/context',
    );
  });

  it('stops offering unchecked packs at the cap', () => {
    picker = { ...picker, atLimit: true };
    renderControls();
    openPicker();

    expect(screen.getByRole('checkbox', { name: /ClawAI/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Trips/ })).not.toBeDisabled();
    expect(screen.getByText('chat.composerContext.pickLimit:10')).toBeInTheDocument();
  });

  it('asks for a fresh preview when the view row is chosen, and opens the pack dialog', () => {
    preview = { ...closedPreview(), bundle: emptyBundle };
    renderControls();
    openDialog(VIEW);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('chat.composerContext.viewTitle')).toBeInTheDocument();
  });

  it('asks for a fresh preview when the memory row is chosen, and opens the memory dialog', () => {
    renderControls();
    openDialog(MEMORY);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('chat.composerContext.memoryTitle')).toBeInTheDocument();
  });

  it('shows the pack content that would be sent, grouped under its pack', () => {
    preview = {
      ...closedPreview(),
      bundle: emptyBundle,
      packGroups: [
        {
          packId: 'p2',
          name: 'ClawAI',
          items: [{ id: 'i1', content: 'Every AI, one workspace.' }] as never,
        },
      ],
    };
    renderControls();
    openDialog(VIEW);

    expect(screen.getAllByText('ClawAI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Every AI, one workspace.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('chat.composerContext.viewItems:1').length).toBeGreaterThan(0);
  });

  it('says context is off instead of listing packs that would not be sent', () => {
    preview = { ...closedPreview(), useContext: false, bundle: null };
    renderControls();
    openDialog(VIEW);

    expect(screen.getAllByText('chat.composerContext.viewDisabled').length).toBeGreaterThan(0);
  });

  it('says there is no pack content when the preview has none', () => {
    preview = { ...closedPreview(), bundle: emptyBundle };
    renderControls();
    openDialog(VIEW);

    expect(screen.getAllByText('chat.composerContext.viewNone').length).toBeGreaterThan(0);
  });

  it('shows memory on and the memories that apply, masking a redacted one', () => {
    preview = { ...closedPreview(), bundle: bundleWithMemory(null) };
    renderControls();
    openDialog(MEMORY);

    expect(screen.getAllByText('chat.composerContext.memoryOn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('preview.redactedPlaceholder').length).toBeGreaterThan(0);
  });

  it('says memory is off, and lists nothing, when the chat has it switched off', () => {
    preview = { ...closedPreview(), useMemory: false, bundle: bundleWithMemory('secret fact') };
    renderControls();
    openDialog(MEMORY);

    expect(screen.getAllByText('chat.composerContext.memoryOff').length).toBeGreaterThan(0);
    expect(screen.queryByText('secret fact')).not.toBeInTheDocument();
  });

  it('links memory to the memory page', () => {
    renderControls();
    openDialog(MEMORY);

    expect(
      screen.getAllByRole('link', { name: 'chat.composerContext.memoryManage', hidden: true })[0],
    ).toHaveAttribute('href', '/memory');
  });

  it('closes the dialog and drops the preview when it is dismissed', () => {
    renderControls();
    openDialog(MEMORY);
    onOpenChange.mockReset();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
