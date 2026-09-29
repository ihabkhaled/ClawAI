import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContextSaveCard } from '@/components/chat/context-save-card';
import { ContextSaveStatus, MemoryType, SaveFailureReason } from '@/enums';
import type { ContextSaveRecord } from '@/types';
import { contextSaveOfMessage } from '@/utilities/context-save.utility';

const choosePack = vi.fn();
const chooseNewPack = vi.fn();

vi.mock('@/hooks/chat/use-context-save-card', () => ({
  useContextSaveCard: () => ({ choosePack, chooseNewPack, isPending: false }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      values?.['name'] === undefined ? key : `${key}:${values['name']}`,
  }),
}));

const render_ = (record: ContextSaveRecord) =>
  render(<ContextSaveCard messageId="a-1" threadId="t-1" record={record} />);

describe('ContextSaveCard (ADR-133)', () => {
  beforeEach(() => {
    choosePack.mockReset();
    chooseNewPack.mockReset();
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

describe('contextSaveOfMessage', () => {
  it('reads a stored record and ignores anything else', () => {
    expect(contextSaveOfMessage({ contextSave: { status: 'SAVED' } })).toEqual({ status: 'SAVED' });
    expect(contextSaveOfMessage({ contextSave: { status: 'BOGUS' } })).toBeNull();
    expect(contextSaveOfMessage(null)).toBeNull();
  });
});
