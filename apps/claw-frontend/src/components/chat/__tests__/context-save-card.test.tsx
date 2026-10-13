import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContextSaveCard } from '@/components/chat/context-save-card';
import { ContextSaveStatus, MemoryType, SaveFailureReason } from '@/enums';
import type { ContextSaveRecord } from '@/types';
import { contextSaveOfMessage } from '@/utilities/context-save.utility';

const choosePack = vi.fn();
const chooseNewPack = vi.fn();
const review = vi.fn();
const dismiss = vi.fn();
let isDismissing = false;

vi.mock('@/hooks/chat/use-context-save-card', () => ({
  useContextSaveCard: () => ({
    choosePack,
    chooseNewPack,
    isPending: false,
    review,
    dismiss,
    isDismissing,
  }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values?.['name'] === undefined ? key : `${key}:${values['name']}`,
  }),
}));

const render_ = (record: ContextSaveRecord) =>
  render(<ContextSaveCard messageId="a-1" threadId="t-1" record={record} />);

describe('ContextSaveCard (ADR-134)', () => {
  beforeEach(() => {
    choosePack.mockReset();
    chooseNewPack.mockReset();
    review.mockReset();
    dismiss.mockReset();
    isDismissing = false;
  });

  it('shows the saved memory with its type and a link to that exact memory', () => {
    render_({
      status: ContextSaveStatus.SAVED,
      memory: {
        id: 'mem-1',
        type: MemoryType.PREFERENCE,
        preview: 'The user is vegetarian.',
        link: '/memory?memoryId=mem-1',
      },
    });

    expect(screen.getByRole('region', { name: 'chat.contextSave.title' })).toBeInTheDocument();
    expect(screen.getByText('memory.typePreference')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chat.contextSave.openMemory' })).toHaveAttribute(
      'href',
      '/memory?memoryId=mem-1',
    );
  });

  it('shows the pack and links to it', () => {
    render_({
      status: ContextSaveStatus.SAVED,
      pack: { id: 'p1', name: 'Trips', created: true, link: '/context?packId=p1' },
    });

    expect(screen.getByText('chat.contextSave.createdPack')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chat.contextSave.openPack' })).toHaveAttribute(
      'href',
      '/context?packId=p1',
    );
  });

  it('asks which pack, offering each pack and a new one', () => {
    render_({
      status: ContextSaveStatus.NEEDS_PACK_CHOICE,
      pending: { suggestedName: 'Paris plan', options: [{ id: 'p1', name: 'Trips' }] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Trips' }));
    fireEvent.click(screen.getByRole('button', { name: 'chat.contextSave.newPack:Paris plan' }));

    expect(choosePack).toHaveBeenCalledWith('p1');
    expect(chooseNewPack).toHaveBeenCalledTimes(1);
  });

  it('says why a save failed instead of claiming success', () => {
    render_({ status: ContextSaveStatus.FAILED, memoryFailure: SaveFailureReason.LIMIT });

    expect(screen.getByRole('alert')).toHaveTextContent('chat.contextSave.reasons.LIMIT');
  });
});

describe('ContextSaveCard proposal (ADR-168)', () => {
  const proposed = (memoryText: string | null = 'The user is vegetarian.'): ContextSaveRecord => ({
    status: ContextSaveStatus.PROPOSED,
    proposal: {
      memory: memoryText === null ? null : { type: 'FACT', text: memoryText },
      pack:
        memoryText === null
          ? {
              source: 'USER_TEXT',
              content: 'Pack text',
              packId: null,
              packName: null,
              newPackName: null,
            }
          : null,
      options: [],
    },
  });

  beforeEach(() => {
    review.mockReset();
    dismiss.mockReset();
    isDismissing = false;
  });

  it('asks "Save to memory?" with a preview and the two buttons', () => {
    render_(proposed());

    expect(screen.getByText('chat.contextSave.proposal.cardTitle')).toBeInTheDocument();
    expect(screen.getByText('The user is vegetarian.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'chat.contextSave.proposal.review' }));
    fireEvent.click(screen.getByRole('button', { name: 'chat.contextSave.proposal.notNow' }));
    expect(review).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('previews the pack text when there is no memory proposed', () => {
    render_(proposed(null));

    expect(screen.getByText('Pack text')).toBeInTheDocument();
  });

  it('disables both buttons while a dismissal is in flight', () => {
    isDismissing = true;
    render_(proposed());

    expect(screen.getByRole('button', { name: 'chat.contextSave.proposal.review' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'chat.contextSave.proposal.notNow' })).toBeDisabled();
  });

  it('renders nothing for a PROPOSED record that lost its proposal', () => {
    const { container } = render_({ status: ContextSaveStatus.PROPOSED });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a DISMISSED record with nothing saved and nothing failed', () => {
    const { container } = render_({ status: ContextSaveStatus.DISMISSED });

    expect(container).toBeEmptyDOMElement();
  });

  it('still renders a DISMISSED record that kept a saved item or a failure', () => {
    const saved = render_({
      status: ContextSaveStatus.DISMISSED,
      pack: { id: 'p1', name: 'Trips', created: false, link: '/context?packId=p1' },
    });
    expect(saved.container).not.toBeEmptyDOMElement();
    saved.unmount();

    render_({ status: ContextSaveStatus.DISMISSED, packFailure: SaveFailureReason.LIMIT });
    expect(screen.getByRole('alert')).toHaveTextContent('chat.contextSave.reasons.LIMIT');
  });

  it('after a half-save shows only the proposal error, not the per-half failure lines', () => {
    render_({
      ...proposed(),
      proposalError: 'PLAN_FEATURE_DISABLED',
      memoryFailure: SaveFailureReason.LIMIT,
      packFailure: SaveFailureReason.LIMIT,
    });

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(
      'chat.contextSave.proposal.partialFailed chat.contextSave.reasons.PLAN',
    );
    expect(screen.queryByText(/chat\.contextSave\.memoryFailed/)).toBeNull();
    expect(screen.queryByText(/chat\.contextSave\.packFailed/)).toBeNull();
  });

  it('does not show the proposal buttons once the save is done', () => {
    render_({ status: ContextSaveStatus.SAVED });

    expect(screen.queryByRole('button', { name: 'chat.contextSave.proposal.review' })).toBeNull();
  });

  it('never claims a save was automatic: the record does not say so, and the way back lives on the memory page', () => {
    render_({
      status: ContextSaveStatus.SAVED,
      memory: {
        id: 'mem-1',
        type: MemoryType.FACT,
        preview: 'The user is vegetarian.',
        link: '/memory?memoryId=mem-1',
      },
    });

    expect(screen.queryByText(/automatic/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /askFirst/ })).toBeNull();
  });

  it('shows why the last confirm stopped halfway, next to the buttons that retry it', () => {
    render_({
      ...proposed(),
      proposalError: 'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED',
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'chat.contextSave.proposal.partialFailed chat.contextSave.reasons.LIMIT',
    );
    expect(screen.getByRole('button', { name: 'chat.contextSave.proposal.review' })).toBeEnabled();
  });

  it('shows the generic line for an unknown error code, and no alert when there is none', () => {
    const { unmount } = render_({ ...proposed(), proposalError: 'SOMETHING_NEW' });
    expect(screen.getByRole('alert')).toHaveTextContent('chat.contextSave.proposal.partialFailed');
    expect(screen.getByRole('alert')).not.toHaveTextContent('reasons');
    unmount();

    render_(proposed());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('contextSaveOfMessage', () => {
  it('reads a stored record and ignores anything else', () => {
    expect(contextSaveOfMessage({ contextSave: { status: 'SAVED' } })).toEqual({ status: 'SAVED' });
    expect(contextSaveOfMessage({ contextSave: { status: 'BOGUS' } })).toBeNull();
    expect(contextSaveOfMessage(null)).toBeNull();
    expect(contextSaveOfMessage({ contextSave: { status: 'PROPOSED' } })).toEqual({
      status: 'PROPOSED',
    });
  });
});
