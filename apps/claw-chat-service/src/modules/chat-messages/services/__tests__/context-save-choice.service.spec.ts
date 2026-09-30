import { type Mock, vi } from 'vitest';
import { ContextSaveStatus } from '../../../../common/enums';
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
