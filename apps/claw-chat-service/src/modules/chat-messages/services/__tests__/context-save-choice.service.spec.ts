import { type Mock, vi } from 'vitest';
import { ContextSaveStatus } from '../../../../common/enums';
import { CONTEXT_SAVE_SAVING_STALE_MS } from '../../constants/save-intent.constants';
import { ContextSaveChoiceService } from '../context-save-choice.service';
import type { ChatMessagesRepository } from '../../repositories/chat-messages.repository';
import type { ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';
import type { ContextSaveClient } from '../../clients/context-save.client';

const pendingRecord = {
  status: ContextSaveStatus.NEEDS_PACK_CHOICE,
  pending: {
    sourceMessageId: 'u-msg',
    content: '## Paris plan',
    suggestedName: 'Paris plan',
    options: [{ id: 'pack-1', name: 'Trips' }],
  },
};

function setup(options: { record?: unknown; owner?: string; claimed?: boolean; addOk?: boolean }): {
  service: ContextSaveChoiceService;
  transition: Mock;
  updateMetadata: Mock;
  client: Record<'addToPack' | 'createPack', Mock>;
} {
  const transition = vi.fn().mockResolvedValue(options.claimed ?? true);
  const updateMetadata = vi.fn().mockResolvedValue(undefined);
  const messages = {
    findById: vi.fn().mockResolvedValue({
      id: 'a-msg',
      threadId: 't1',
      role: 'ASSISTANT',
      metadata: { contextSave: options.record ?? pendingRecord, other: 1 },
    }),
    transitionContextSave: transition,
    updateMetadata,
  } as unknown as ChatMessagesRepository;
  const threads = {
    findById: vi.fn().mockResolvedValue({ id: 't1', userId: options.owner ?? 'u1' }),
  } as unknown as ChatThreadsRepository;
  const client = {
    addToPack: vi
      .fn()
      .mockResolvedValue(
        options.addOk === false
          ? { ok: false, reason: 'LIMIT' }
          : { ok: true, value: { id: 'pack-1', name: 'Trips' } },
      ),
    createPack: vi.fn().mockResolvedValue({
      ok: true,
      value: { id: 'pack-new', name: 'Paris plan', created: true },
    }),
  };
  return {
    service: new ContextSaveChoiceService(
      messages,
      threads,
      client as unknown as ContextSaveClient,
    ),
    transition,
    updateMetadata,
    client,
  };
}

describe('ContextSaveChoiceService (ADR-134)', () => {
  it('adds the waiting text to the pack the user picked and marks it saved', async () => {
    const { service, client, updateMetadata } = setup({});

    const record = await service.choose('u1', 'a-msg', { packId: 'pack-1' });

    expect(client.addToPack).toHaveBeenCalledWith({
      userId: 'u1',
      packId: 'pack-1',
      sourceMessageId: 'u-msg',
      content: '## Paris plan',
    });
    expect(record).toMatchObject({
      status: ContextSaveStatus.SAVED,
      pack: { id: 'pack-1', name: 'Trips', created: false, link: '/context?packId=pack-1' },
    });
    expect(record.pending).toBeUndefined();
    const [, written] = updateMetadata.mock.calls[0] ?? [];
    expect(written).toMatchObject({ other: 1, contextSave: { status: ContextSaveStatus.SAVED } });
  });

  it('creates a new pack under the suggested name', async () => {
    const { service, client } = setup({});

    await service.choose('u1', 'a-msg', { newPack: true });

    expect(client.createPack).toHaveBeenCalledWith(expect.objectContaining({ name: 'Paris plan' }));
  });

  it("answers 404 for someone else's message (IDOR), before touching anything", async () => {
    const { service, transition } = setup({ owner: 'someone-else' });

    await expect(service.choose('u1', 'a-msg', { packId: 'pack-1' })).rejects.toThrow();
    expect(transition).not.toHaveBeenCalled();
  });

  it('refuses a pack that was not offered', async () => {
    const { service } = setup({});

    await expect(service.choose('u1', 'a-msg', { packId: 'pack-x' })).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_UNKNOWN_PACK',
    });
  });

  it('saves once: a second click that loses the claim is refused', async () => {
    const { service, client } = setup({ claimed: false });

    await expect(service.choose('u1', 'a-msg', { packId: 'pack-1' })).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
    expect(client.addToPack).not.toHaveBeenCalled();
  });

  it('refuses when the save is not waiting for a pack', async () => {
    const { service } = setup({ record: { status: ContextSaveStatus.SAVED } });

    await expect(service.choose('u1', 'a-msg', { newPack: true })).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
  });

  it('puts the card back to "choose" and reports the plan limit when the save fails', async () => {
    const { service, updateMetadata } = setup({ addOk: false });

    await expect(service.choose('u1', 'a-msg', { packId: 'pack-1' })).rejects.toMatchObject({
      code: 'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED',
    });
    const [, written] = updateMetadata.mock.calls[0] ?? [];
    expect(written).toMatchObject({
      contextSave: { status: ContextSaveStatus.NEEDS_PACK_CHOICE, packFailure: 'LIMIT' },
    });
  });
});

describe('ContextSaveChoiceService — a record never stays SAVING (ADR-168)', () => {
  it('claims with a savingSince stamp', async () => {
    const { service, transition } = setup({});

    await service.choose('u1', 'a-msg', { packId: 'pack-1' });

    const [, from, claimDoc] = transition.mock.calls[0] ?? [];
    expect(from).toBe(ContextSaveStatus.NEEDS_PACK_CHOICE);
    expect(claimDoc).toMatchObject({ contextSave: { status: ContextSaveStatus.SAVING } });
    expect(
      typeof (claimDoc as { contextSave: { savingSince?: unknown } }).contextSave.savingSince,
    ).toBe('string');
  });

  it('a throw after the claim puts the card back to "choose" and rethrows', async () => {
    const { service, client, updateMetadata } = setup({});
    client.addToPack.mockRejectedValueOnce(new Error('socket hang up'));

    await expect(service.choose('u1', 'a-msg', { packId: 'pack-1' })).rejects.toThrow(
      'socket hang up',
    );

    const [, written] = updateMetadata.mock.calls[0] ?? [];
    expect(written).toMatchObject({
      other: 1,
      contextSave: {
        status: ContextSaveStatus.NEEDS_PACK_CHOICE,
        pending: { content: '## Paris plan' },
      },
    });
    expect(
      (written as { contextSave: Record<string, unknown> }).contextSave['savingSince'],
    ).toBeUndefined();
  });

  it('a failed write of the final record also releases the claim', async () => {
    const { service, updateMetadata } = setup({});
    updateMetadata.mockRejectedValueOnce(new Error('db down'));

    await expect(service.choose('u1', 'a-msg', { packId: 'pack-1' })).rejects.toThrow('db down');

    expect(updateMetadata).toHaveBeenCalledTimes(2);
    expect(updateMetadata.mock.calls[1]?.[1]).toMatchObject({
      contextSave: { status: ContextSaveStatus.NEEDS_PACK_CHOICE },
    });
  });

  it('if even the release fails, the original error still surfaces', async () => {
    const { service, updateMetadata } = setup({});
    updateMetadata.mockRejectedValue(new Error('db down'));

    await expect(service.choose('u1', 'a-msg', { packId: 'pack-1' })).rejects.toThrow('db down');
  });

  it('a SAVING record older than two minutes is treated as waiting again', async () => {
    const savingSince = new Date(Date.now() - CONTEXT_SAVE_SAVING_STALE_MS - 1_000).toISOString();
    const { service, client, transition } = setup({
      record: { ...pendingRecord, status: ContextSaveStatus.SAVING, savingSince },
    });

    const record = await service.choose('u1', 'a-msg', { packId: 'pack-1' });

    expect(transition.mock.calls[0]?.[1]).toBe(ContextSaveStatus.SAVING);
    expect(transition.mock.calls[0]?.[3]).toBe(savingSince);
    expect(client.addToPack).toHaveBeenCalledTimes(1);
    expect(record.status).toBe(ContextSaveStatus.SAVED);
  });

  it('a fresh SAVING record is somebody else working: refused', async () => {
    const { service, client, transition } = setup({
      record: {
        ...pendingRecord,
        status: ContextSaveStatus.SAVING,
        savingSince: new Date().toISOString(),
      },
    });

    await expect(service.choose('u1', 'a-msg', { packId: 'pack-1' })).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
    expect(transition).not.toHaveBeenCalled();
    expect(client.addToPack).not.toHaveBeenCalled();
  });

  it('a DISMISSED record is final', async () => {
    const { service, transition } = setup({
      record: { ...pendingRecord, status: ContextSaveStatus.DISMISSED },
    });

    await expect(service.choose('u1', 'a-msg', { newPack: true })).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
    expect(transition).not.toHaveBeenCalled();
  });
});
