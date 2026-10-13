import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContextSaveProposalDialog } from '@/components/chat/context-save-proposal-dialog';
import {
  CONTEXT_SAVE_MEMORY_MAX_CHARS,
  CONTEXT_SAVE_PACK_NAME_MAX_CHARS,
} from '@/constants/context-save.constants';
import { useContextSaveProposalStore } from '@/stores/context-save-proposal.store';
import { signInTestUser, signOutTestUser } from '@/test/fixtures/signed-in-user.fixture';
import type { ContextSaveProposal } from '@/types';
import {
  contextSaveModeStorageKey,
  resetContextSaveModeMemory,
} from '@/utilities/context-save-mode.utility';

const mockConfirm = vi.fn();
const mockDismiss = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    confirmContextSave: (...args: unknown[]) => mockConfirm(...args),
    dismissContextSave: (...args: unknown[]) => mockDismiss(...args),
  },
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values === undefined ? key : `${key}:${Object.values(values).join('|')}`,
  }),
}));
vi.mock('@/utilities', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, showToast: { success: vi.fn(), apiError: vi.fn() } };
});

const PACK = {
  source: 'USER_TEXT' as const,
  content: 'Tea notes\n\nSecond paragraph',
  packId: 'p1',
  packName: 'Trips',
  newPackName: null,
};

const PROPOSAL: ContextSaveProposal = {
  memory: { type: 'PREFERENCE', text: 'The user prefers tea.' },
  pack: PACK,
  options: [
    { id: 'p1', name: 'Trips', itemCount: 3 },
    { id: 'p2', name: 'Work', itemCount: 0 },
  ],
};

const MODE_KEY = contextSaveModeStorageKey('user-1');
const user = userEvent.setup({ pointerEventsCheck: 0 });

const renderDialog = (proposal: ContextSaveProposal = PROPOSAL, onClose = vi.fn()) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const element = (next: ContextSaveProposal) => (
    <ContextSaveProposalDialog messageId="a-1" threadId="t-1" proposal={next} onClose={onClose} />
  );
  const view = render(element(proposal), { wrapper });
  return {
    ...view,
    onClose,
    showProposal: (next: ContextSaveProposal) => view.rerender(element(next)),
  };
};

const saveButton = () => screen.getByRole('button', { name: 'chat.contextSave.proposal.save' });
const memoryText = () => screen.getByLabelText('chat.contextSave.proposal.memoryText');
const packContent = () => screen.getByLabelText('chat.contextSave.proposal.packContent');
const memoryTypeTrigger = () => screen.getByLabelText('chat.contextSave.proposal.memoryType');
const packTrigger = () => screen.getByLabelText('chat.contextSave.proposal.packChoose');
const alwaysAuto = () =>
  screen.getByRole('checkbox', { name: /chat\.contextSave\.proposal\.alwaysAuto/ });

async function choose(trigger: HTMLElement, optionName: string): Promise<void> {
  await user.click(trigger);
  await user.click(await screen.findByRole('option', { name: optionName }));
}

async function optionLabels(trigger: HTMLElement): Promise<string[]> {
  await user.click(trigger);
  const labels = (await screen.findAllByRole('option')).map((option) => option.textContent ?? '');
  await user.keyboard('{Escape}');
  return labels;
}

describe('ContextSaveProposalDialog (ADR-168)', () => {
  beforeEach(() => {
    mockConfirm.mockReset();
    mockDismiss.mockReset();
    window.localStorage.clear();
    resetContextSaveModeMemory();
    signInTestUser('user-1');
    useContextSaveProposalStore.getState().close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    signOutTestUser();
  });

  it('opens as a labelled dialog with both sections prefilled and Save enabled', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: 'chat.contextSave.proposal.dialogTitle' });
    expect(dialog).toHaveAccessibleDescription('chat.contextSave.proposal.dialogDescription');
    expect(memoryText()).toHaveValue('The user prefers tea.');
    expect(memoryTypeTrigger()).toHaveTextContent('memory.typePreference');
    expect(packContent()).toHaveValue('Tea notes\n\nSecond paragraph');
    expect(packTrigger()).toHaveTextContent('chat.contextSave.proposal.packOption:Trips|3');
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('uses the shared Select for both pickers, not a native select', () => {
    renderDialog();

    expect(document.querySelector('select')).toBeNull();
    expect(memoryTypeTrigger()).toHaveAttribute('role', 'combobox');
    expect(packTrigger()).toHaveAttribute('role', 'combobox');
  });

  it('offers the four memory types with translated labels', async () => {
    renderDialog();

    expect(await optionLabels(memoryTypeTrigger())).toEqual([
      'memory.typeFact',
      'memory.typePreference',
      'memory.typeInstruction',
      'memory.typeSummary',
    ]);
  });

  it('lists each existing pack with its size, plus a new pack', async () => {
    renderDialog();

    expect(await optionLabels(packTrigger())).toEqual([
      'chat.contextSave.proposal.packOption:Trips|3',
      'chat.contextSave.proposal.packOption:Work|0',
      'chat.contextSave.proposal.packNew',
    ]);
  });

  it('saves exactly what the user edited', async () => {
    mockConfirm.mockResolvedValue({ status: 'SAVED' });
    const { onClose } = renderDialog();

    await choose(memoryTypeTrigger(), 'memory.typeInstruction');
    fireEvent.change(memoryText(), { target: { value: 'Always offer tea.' } });
    await choose(packTrigger(), 'chat.contextSave.proposal.packOption:Work|0');
    fireEvent.click(saveButton());

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(mockConfirm).toHaveBeenCalledWith('a-1', {
      memory: { type: 'INSTRUCTION', text: 'Always offer tea.' },
      pack: { packId: 'p2', newPackName: null, content: 'Tea notes\n\nSecond paragraph' },
    });
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('saves a new pack under the typed name', async () => {
    mockConfirm.mockResolvedValue({ status: 'SAVED' });
    renderDialog();

    await choose(packTrigger(), 'chat.contextSave.proposal.packNew');
    expect(saveButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('chat.contextSave.proposal.packNewName'), {
      target: { value: ' Tea ' },
    });
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton());

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
    expect(mockConfirm.mock.calls[0]?.[1].pack).toEqual({
      packId: null,
      newPackName: 'Tea',
      content: 'Tea notes\n\nSecond paragraph',
    });
  });

  it('can save the memory alone by switching the pack section off', async () => {
    mockConfirm.mockResolvedValue({ status: 'SAVED' });
    renderDialog();

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'chat.contextSave.proposal.packSection' }),
    );
    expect(screen.queryByLabelText('chat.contextSave.proposal.packContent')).toBeNull();
    fireEvent.click(saveButton());

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
    expect(mockConfirm.mock.calls[0]?.[1]).toEqual({
      memory: { type: 'PREFERENCE', text: 'The user prefers tea.' },
      pack: null,
    });
  });

  it('shows only the sections the model proposed as switched on', () => {
    renderDialog({ ...PROPOSAL, memory: null });

    expect(
      screen.getByRole('checkbox', { name: 'chat.contextSave.proposal.memorySection' }),
    ).not.toBeChecked();
    expect(screen.queryByLabelText('chat.contextSave.proposal.memoryText')).toBeNull();
    expect(saveButton()).toBeEnabled();
  });

  it('blocks Save with an alert when nothing is selected', () => {
    renderDialog();

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'chat.contextSave.proposal.memorySection' }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'chat.contextSave.proposal.packSection' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'chat.contextSave.proposal.errors.nothingSelected',
    );
    expect(saveButton()).toBeDisabled();
  });

  it('blocks Save with an alert next to a blank field, linked to it', () => {
    renderDialog();

    fireEvent.change(memoryText(), { target: { value: '   ' } });

    expect(screen.getByRole('alert')).toHaveTextContent('chat.contextSave.proposal.errors.empty');
    expect(memoryText()).toHaveAttribute('aria-invalid', 'true');
    expect(memoryText()).toHaveAccessibleDescription('chat.contextSave.proposal.errors.empty');
    expect(saveButton()).toBeDisabled();
    fireEvent.click(saveButton());
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('makes the user pick a pack when the model did not match one, and links the error', () => {
    renderDialog({
      ...PROPOSAL,
      pack: { ...PACK, packId: null, packName: null },
    });

    expect(packTrigger()).toHaveTextContent('chat.contextSave.proposal.packPick');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'chat.contextSave.proposal.errors.packRequired',
    );
    expect(packTrigger()).toHaveAttribute('aria-invalid', 'true');
    expect(packTrigger()).toHaveAccessibleDescription(
      'chat.contextSave.proposal.errors.packRequired',
    );
  });

  it('links the new pack name and the pack content to their errors', async () => {
    renderDialog();

    await choose(packTrigger(), 'chat.contextSave.proposal.packNew');
    const name = screen.getByLabelText('chat.contextSave.proposal.packNewName');
    expect(name).toHaveAccessibleDescription('chat.contextSave.proposal.errors.empty');
    fireEvent.change(name, { target: { value: 'n'.repeat(CONTEXT_SAVE_PACK_NAME_MAX_CHARS + 1) } });
    expect(name).toHaveAccessibleDescription('chat.contextSave.proposal.errors.tooLong');

    fireEvent.change(packContent(), { target: { value: '' } });
    expect(packContent()).toHaveAccessibleDescription('chat.contextSave.proposal.errors.empty');
  });

  it('refuses memory text and a pack name longer than the server accepts', async () => {
    renderDialog();

    fireEvent.change(memoryText(), {
      target: { value: 'a'.repeat(CONTEXT_SAVE_MEMORY_MAX_CHARS + 1) },
    });
    expect(saveButton()).toBeDisabled();
    expect(memoryText()).toHaveAccessibleDescription('chat.contextSave.proposal.errors.tooLong');

    fireEvent.change(memoryText(), {
      target: { value: 'a'.repeat(CONTEXT_SAVE_MEMORY_MAX_CHARS) },
    });
    expect(saveButton()).toBeEnabled();
  });

  it('"Not now" dismisses without saving and closes', async () => {
    mockDismiss.mockResolvedValue({ status: 'DISMISSED' });
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'chat.contextSave.proposal.notNow' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(mockDismiss).toHaveBeenCalledWith('a-1');
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('keeps the dialog and the typed edits when the save fails, and says why', async () => {
    mockConfirm.mockRejectedValue(new Error('Memory service is down'));
    const { onClose } = renderDialog();

    fireEvent.change(memoryText(), { target: { value: 'My edit' } });
    fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Memory service is down');
    expect(onClose).not.toHaveBeenCalled();
    expect(memoryText()).toHaveValue('My edit');
    expect(saveButton()).toBeEnabled();
  });

  describe('a confirm that answers 200 but saved only part of it', () => {
    const HALF_SAVED = {
      status: 'PROPOSED',
      proposalError: 'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED',
    };

    it('is not "Saved": the dialog stays open and says why', async () => {
      mockConfirm.mockResolvedValue(HALF_SAVED);
      const { onClose } = renderDialog();

      fireEvent.click(saveButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'chat.contextSave.proposal.partialFailed chat.contextSave.reasons.LIMIT',
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(saveButton()).toBeEnabled();
    });

    it('starts the form again from the smaller proposal, so a retry never re-sends the saved half', async () => {
      mockConfirm.mockResolvedValueOnce(HALF_SAVED).mockResolvedValueOnce({ status: 'SAVED' });
      const { onClose, showProposal } = renderDialog();
      fireEvent.change(packContent(), { target: { value: 'Edited pack text' } });
      fireEvent.click(saveButton());
      await screen.findByRole('alert');

      // The refetch brings back the record minus the memory that already saved.
      showProposal({
        ...PROPOSAL,
        memory: null,
        pack: { ...PACK, content: 'Edited pack text', newPackName: null },
      });

      await waitFor(() =>
        expect(
          screen.getByRole('checkbox', { name: 'chat.contextSave.proposal.memorySection' }),
        ).not.toBeChecked(),
      );
      expect(screen.queryByLabelText('chat.contextSave.proposal.memoryText')).toBeNull();
      expect(packContent()).toHaveValue('Edited pack text');
      // The reason stays visible: this is the same dialog, not a new one.
      expect(screen.getByRole('alert')).toHaveTextContent('partialFailed');

      fireEvent.click(saveButton());

      await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(mockConfirm.mock.calls[1]?.[1]).toEqual({
        memory: null,
        pack: { packId: 'p1', newPackName: null, content: 'Edited pack text' },
      });
    });

    it('keeps what the user typed while the proposal itself has not changed', async () => {
      mockConfirm.mockResolvedValue(HALF_SAVED);
      const { showProposal } = renderDialog();
      fireEvent.change(memoryText(), { target: { value: 'My edit' } });
      fireEvent.click(saveButton());
      await screen.findByRole('alert');

      showProposal({ ...PROPOSAL });

      expect(memoryText()).toHaveValue('My edit');
    });
  });

  it('disables the controls and ignores a second click while saving', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockConfirm.mockReturnValue(new Promise((r) => (resolve = r)));
    renderDialog();

    fireEvent.click(saveButton());
    await waitFor(() => expect(memoryText()).toBeDisabled());
    const saving = screen.getByRole('button', { name: 'chat.contextSave.saving' });
    expect(saving).toBeDisabled();
    fireEvent.click(saving);
    expect(screen.getByRole('button', { name: 'chat.contextSave.proposal.notNow' })).toBeDisabled();

    resolve({ status: 'SAVED' });
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
  });

  it('tells the thread page it is busy while its own save is in flight, and clears it after', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockConfirm.mockReturnValue(new Promise((r) => (resolve = r)));
    renderDialog();
    expect(useContextSaveProposalStore.getState().isBusy).toBe(false);

    fireEvent.click(saveButton());
    await waitFor(() => expect(useContextSaveProposalStore.getState().isBusy).toBe(true));

    resolve({ status: 'PROPOSED' });
    await waitFor(() => expect(useContextSaveProposalStore.getState().isBusy).toBe(false));
  });

  it('Escape closes the dialog but keeps the proposal (no dismiss call)', () => {
    const { onClose } = renderDialog();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  describe('"Always save automatically"', () => {
    it('starts unticked and is only a draft until Save: ticking writes nothing', () => {
      renderDialog();
      expect(alwaysAuto()).not.toBeChecked();

      fireEvent.click(alwaysAuto());

      expect(alwaysAuto()).toBeChecked();
      expect(window.localStorage.getItem(MODE_KEY)).toBeNull();
    });

    it('is applied when Save is pressed', async () => {
      mockConfirm.mockResolvedValue({ status: 'SAVED' });
      renderDialog();

      fireEvent.click(alwaysAuto());
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
      expect(window.localStorage.getItem(MODE_KEY)).toBe('AUTO');
    });

    it('is thrown away by "Not now"', async () => {
      mockDismiss.mockResolvedValue({ status: 'DISMISSED' });
      const { onClose } = renderDialog();

      fireEvent.click(alwaysAuto());
      fireEvent.click(screen.getByRole('button', { name: 'chat.contextSave.proposal.notNow' }));

      await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
      expect(window.localStorage.getItem(MODE_KEY)).toBeNull();
    });

    it('is thrown away by closing with Escape', () => {
      const { onClose } = renderDialog();

      fireEvent.click(alwaysAuto());
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(onClose).toHaveBeenCalledOnce();
      expect(window.localStorage.getItem(MODE_KEY)).toBeNull();
    });

    it('can be unticked and applied to go back to asking first', async () => {
      window.localStorage.setItem(MODE_KEY, 'AUTO');
      mockConfirm.mockResolvedValue({ status: 'SAVED' });
      renderDialog();
      expect(alwaysAuto()).toBeChecked();

      fireEvent.click(alwaysAuto());
      expect(window.localStorage.getItem(MODE_KEY)).toBe('AUTO');
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
      expect(window.localStorage.getItem(MODE_KEY)).toBeNull();
    });

    it('is not written for another account', async () => {
      mockConfirm.mockResolvedValue({ status: 'SAVED' });
      renderDialog();

      fireEvent.click(alwaysAuto());
      fireEvent.click(saveButton());
      await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());

      expect(window.localStorage.getItem(contextSaveModeStorageKey('user-2'))).toBeNull();
    });

    it('still works when localStorage is blocked', async () => {
      mockConfirm.mockResolvedValue({ status: 'SAVED' });
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      renderDialog();

      expect(() => fireEvent.click(alwaysAuto())).not.toThrow();
      expect(alwaysAuto()).toBeChecked();
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockConfirm).toHaveBeenCalledOnce());
    });
  });
});
