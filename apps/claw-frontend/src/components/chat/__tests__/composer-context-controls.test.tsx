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
  fireEvent.click(screen.getByRole('button', { name: 'chat.composerContext.pickLabel' }));
};

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

  it('renders the three controls, each with an accessible name', () => {
    renderControls();

    expect(
      screen.getByRole('button', { name: 'chat.composerContext.pickLabel' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'chat.composerContext.viewLabel' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'chat.composerContext.memoryLabel' }),
    ).toBeInTheDocument();
  });

  it('shows how many packs are attached on the picker', () => {
    renderControls();

    expect(
      screen.getByRole('button', { name: 'chat.composerContext.pickLabel' }),
    ).toHaveTextContent('1');
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

  it('asks for a fresh preview when the pack view opens', () => {
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'chat.composerContext.viewLabel' }));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('shows the pack content that would be sent, grouped under its pack', () => {
    preview = {
      ...closedPreview(),
      open: true,
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

    expect(screen.getAllByText('ClawAI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Every AI, one workspace.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('chat.composerContext.viewItems:1').length).toBeGreaterThan(0);
  });

  it('says context is off instead of listing packs that would not be sent', () => {
    preview = { ...closedPreview(), open: true, useContext: false, bundle: null };
    renderControls();

    expect(screen.getAllByText('chat.composerContext.viewDisabled').length).toBeGreaterThan(0);
  });

  it('says there is no pack content when the preview has none', () => {
    preview = { ...closedPreview(), open: true, bundle: emptyBundle };
    renderControls();

    expect(screen.getAllByText('chat.composerContext.viewNone').length).toBeGreaterThan(0);
  });

  it('shows memory on and the memories that apply, masking a redacted one', () => {
    preview = { ...closedPreview(), open: true, bundle: bundleWithMemory(null) };
    renderControls();

    expect(screen.getAllByText('chat.composerContext.memoryOn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('preview.redactedPlaceholder').length).toBeGreaterThan(0);
  });

  it('says memory is off, and lists nothing, when the chat has it switched off', () => {
    preview = {
      ...closedPreview(),
      open: true,
      useMemory: false,
      bundle: bundleWithMemory('secret fact'),
    };
    renderControls();

    expect(screen.getAllByText('chat.composerContext.memoryOff').length).toBeGreaterThan(0);
    expect(screen.queryByText('secret fact')).not.toBeInTheDocument();
  });

  it('links memory to the memory page', () => {
    preview = { ...closedPreview(), open: true };
    renderControls();

    expect(
      screen.getAllByRole('link', { name: 'chat.composerContext.memoryManage', hidden: true })[0],
    ).toHaveAttribute('href', '/memory');
  });
});
