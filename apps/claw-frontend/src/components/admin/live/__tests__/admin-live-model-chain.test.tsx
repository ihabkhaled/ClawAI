import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminLiveModelChain } from '@/components/admin/live/admin-live-model-chain';
import { LIVE_MODEL_CHAIN_EDITORS } from '@/constants/live-model-chain.constants';
import { LiveModelChainDirection, LiveModelChainKind } from '@/enums/live-model-chain.enum';
import type { ModelPickerGroup } from '@/types/component.types';
import type { LiveModelChainEditorOption, LiveModelRef } from '@/types/live-admin.types';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key} ${Object.values(params).join(',')}`;

const gemma = { connector: 'OLLAMA', model: 'gemma4:31b', style: 'OLLAMA' };
const gemini = { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' };

const GROUPS: ModelPickerGroup[] = [
  {
    key: 'GEMINI',
    label: 'Google Gemini',
    options: [{ value: 'GEMINI::gemini-3.1-flash-lite', label: 'Gemini Flash Lite' }],
  },
  {
    key: 'OLLAMA',
    label: 'Ollama (Connector)',
    options: [{ value: 'OLLAMA::gemma4:31b', label: 'Gemma 4 31B' }],
  },
  {
    key: 'OPENAI',
    label: 'OpenAI',
    options: [
      { value: 'OPENAI::gpt-5', label: 'GPT 5', isLocked: true, lockedLabel: 'Not for Live' },
    ],
  },
];

function editor(kind: LiveModelChainKind): LiveModelChainEditorOption {
  const found = LIVE_MODEL_CHAIN_EDITORS.find((entry) => entry.kind === kind);
  if (found === undefined) {
    throw new Error(`no editor for ${kind}`);
  }
  return found;
}

function renderChain(kind: LiveModelChainKind, chain: LiveModelRef[], invalid = false) {
  const actions = {
    setChainModel: vi.fn(),
    moveChainRow: vi.fn(),
    removeChainRow: vi.fn(),
    addChainRow: vi.fn(),
  };
  render(
    <AdminLiveModelChain
      editor={editor(kind)}
      chain={chain}
      groups={GROUPS}
      isLoading={false}
      invalid={invalid}
      t={t}
      actions={actions}
    />,
  );
  return actions;
}

describe('AdminLiveModelChain', () => {
  it('shows one picker per model, in order, with the chosen model on each', () => {
    renderChain(LiveModelChainKind.SUMMARY, [gemma, gemini]);
    expect(screen.getByText('live.admin.summaryChainTitle 5')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'live.admin.modelPosition 1' })).toHaveTextContent(
      'Gemma 4 31B',
    );
    expect(screen.getByRole('combobox', { name: 'live.admin.modelPosition 2' })).toHaveTextContent(
      'Gemini Flash Lite',
    );
  });

  it('opens the chat model catalogue and picks a model; an unsupported one is refused', () => {
    const actions = renderChain(LiveModelChainKind.VISION, [gemini]);
    fireEvent.click(screen.getByRole('combobox', { name: 'live.admin.modelPosition 1' }));
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
    expect(screen.getByText('Ollama (Connector)')).toBeInTheDocument();
    expect(screen.getByText('Not for Live')).toBeInTheDocument();
    fireEvent.click(screen.getByText('GPT 5'));
    expect(actions.setChainModel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Gemma 4 31B'));
    expect(actions.setChainModel).toHaveBeenCalledWith(
      LiveModelChainKind.VISION,
      0,
      'OLLAMA::gemma4:31b',
    );
  });

  it('moves and removes rows; the ends are disabled', () => {
    const actions = renderChain(LiveModelChainKind.SUMMARY, [gemma, gemini]);
    expect(screen.getByRole('button', { name: 'live.admin.moveUp 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'live.admin.moveDown 2' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'live.admin.moveDown 1' }));
    expect(actions.moveChainRow).toHaveBeenCalledWith(
      LiveModelChainKind.SUMMARY,
      0,
      LiveModelChainDirection.DOWN,
    );
    fireEvent.click(screen.getByRole('button', { name: 'live.admin.removeModel 2' }));
    expect(actions.removeChainRow).toHaveBeenCalledWith(LiveModelChainKind.SUMMARY, 1);
  });

  it('keeps at least one agent: the only row cannot be removed', () => {
    renderChain(LiveModelChainKind.COUNCIL, [gemini]);
    expect(screen.getByRole('button', { name: 'live.admin.removeModel 1' })).toBeDisabled();
    expect(screen.getByText('live.admin.councilChainHint')).toBeInTheDocument();
  });

  it('adds an agent below 3', () => {
    const actions = renderChain(LiveModelChainKind.COUNCIL, [gemini, gemma]);
    fireEvent.click(screen.getByRole('button', { name: /live\.admin\.addAgent/u }));
    expect(actions.addChainRow).toHaveBeenCalledWith(LiveModelChainKind.COUNCIL);
  });

  it('disables "Add agent" at the maximum of 3', () => {
    renderChain(LiveModelChainKind.COUNCIL, [gemini, gemma, gemini]);
    expect(screen.getByRole('button', { name: /live\.admin\.addAgent/u })).toBeDisabled();
  });

  it('names the limits when the chain is invalid', () => {
    renderChain(LiveModelChainKind.COUNCIL, [gemini], true);
    expect(screen.getByRole('alert')).toHaveTextContent('live.admin.chainLimit 1,3');
  });
});
