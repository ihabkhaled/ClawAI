import { type Mock, vi } from 'vitest';
import { ContextSaveStatus } from '../../../../common/enums';
import { EntityNotFoundException } from '../../../../common/errors';
import type { ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';
import type { ContextSaveClient } from '../../clients/context-save.client';
import {
  type ContextSaveProposalConfirmDto,
  contextSaveProposalConfirmSchema,
} from '../../dto/context-save-proposal-confirm.dto';
import type { ChatMessagesRepository } from '../../repositories/chat-messages.repository';
import {
  CONTEXT_SAVE_PROPOSAL_ERROR_CODES,
  CONTEXT_SAVE_SAVING_STALE_MS,
  SAVE_INTENT_MEMORY_TEXT_MAX_CHARS,
  SAVE_INTENT_SUMMARY_MAX_CHARS,
} from '../../constants/save-intent.constants';
import { ContextSaveProposalService } from '../context-save-proposal.service';

const proposedRecord = {
  status: ContextSaveStatus.PROPOSED,
  sourceMessageId: 'u-msg',
  proposal: {
    memory: { type: 'PREFERENCE', text: 'The user is vegetarian.' },
    pack: {
      source: 'USER_TEXT',
      content: 'Diet notes',
      packId: null,
      packName: null,
      newPackName: 'Diet',
    },
    options: [{ id: 'pack-1', name: 'Trips', itemCount: 2 }],
  },
};

const memoryOnly: ContextSaveProposalConfirmDto = {
  memory: { type: 'PREFERENCE', text: 'The user is vegetarian.' },
  pack: null,
};

type Stored = { contextSave?: Record<string, unknown>; other?: number };

function setup(options: {
  record?: Record<string, unknown>;
  owner?: string;
  memoryOk?: boolean;
  packOk?: boolean;
}): {
  service: ContextSaveProposalService;
  stored: () => Stored;
  transition: Mock;
  updateMetadata: Mock;
  client: Record<'saveMemory' | 'createPack' | 'addToPack', Mock>;
} {
  // A tiny stateful stand-in for the row, so the atomic claim behaves like the
  // real conditional update: the second claimant loses.
  let metadata: Stored = { contextSave: options.record ?? proposedRecord, other: 1 };
  const transition = vi
    .fn()
    .mockImplementation(
      async (_id: string, from: string, next: Stored, since?: string): Promise<boolean> => {
        if (metadata.contextSave?.['status'] !== from) return false;
        if (since !== undefined && metadata.contextSave?.['savingSince'] !== since) return false;
        metadata = next;
        return true;
      },
    );
  const updateMetadata = vi.fn().mockImplementation(async (_id: string, next: Stored) => {
    metadata = next;
  });
  const messages = {
    findById: vi.fn().mockImplementation(async () => ({
      id: 'a-msg',
      threadId: 't1',
      role: 'ASSISTANT',
      metadata,
    })),
    transitionContextSave: transition,
    updateMetadata,
  } as unknown as ChatMessagesRepository;
  const threads = {
    findById: vi.fn().mockResolvedValue({ id: 't1', userId: options.owner ?? 'u1' }),
  } as unknown as ChatThreadsRepository;
  const client = {
    saveMemory: vi
      .fn()
      .mockResolvedValue(
        options.memoryOk === false
          ? { ok: false, reason: 'UNAVAILABLE' }
          : { ok: true, value: { id: 'mem-1', content: 'x', created: true } },
      ),
    createPack: vi
      .fn()
      .mockResolvedValue(
        options.packOk === false
          ? { ok: false, reason: 'LIMIT' }
          : { ok: true, value: { id: 'pack-new', name: 'Diet', created: true } },
      ),
    addToPack: vi.fn().mockResolvedValue({ ok: true, value: { id: 'pack-1', name: 'Trips' } }),
  };
  return {
    service: new ContextSaveProposalService(
      messages,
      threads,
      client as unknown as ContextSaveClient,
    ),
    stored: () => metadata,
    transition,
    updateMetadata,
    client,
  };
}

describe('ContextSaveProposalService.confirm (ADR-168)', () => {
  it('saves the memory and a new pack, writes SAVED and drops the proposal', async () => {
    const { service, stored, client } = setup({});

    const result = await service.confirm('u1', 'a-msg', {
      memory: { type: 'PREFERENCE', text: 'The user is vegetarian.' },
      pack: { packId: null, newPackName: 'Diet', content: 'Diet notes' },
    });

    expect(client.saveMemory).toHaveBeenCalledWith({
      userId: 'u1',
      threadId: 't1',
      sourceMessageId: 'u-msg',
      type: 'PREFERENCE',
      content: 'The user is vegetarian.',
    });
    expect(client.createPack).toHaveBeenCalledWith({
      userId: 'u1',
      sourceMessageId: 'u-msg',
      name: 'Diet',
      content: 'Diet notes',
    });
    expect(result).toMatchObject({
      status: ContextSaveStatus.SAVED,
      memory: { id: 'mem-1', link: '/memory?memoryId=mem-1' },
      pack: { id: 'pack-new', created: true, link: '/context?packId=pack-new' },
    });
    expect(result.proposal).toBeUndefined();
    expect(stored().contextSave).toMatchObject({ status: ContextSaveStatus.SAVED });
    expect(stored().other).toBe(1);
  });

  it("saves the user's edited text verbatim, not the proposal's", async () => {
    const { service, client } = setup({});
    const edited = '  I am vegan now, and allergic to nuts.  ';

    await service.confirm('u1', 'a-msg', { memory: { type: 'FACT', text: edited }, pack: null });

    expect(client.saveMemory).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FACT', content: edited }),
    );
  });

  it('adds to an existing pack when one is chosen', async () => {
    const { service, client } = setup({});

    const result = await service.confirm('u1', 'a-msg', {
      memory: null,
      pack: { packId: 'pack-1', newPackName: null, content: 'Edited pack text' },
    });

    expect(client.addToPack).toHaveBeenCalledWith({
      userId: 'u1',
      packId: 'pack-1',
      sourceMessageId: 'u-msg',
      content: 'Edited pack text',
    });
    expect(client.saveMemory).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: ContextSaveStatus.SAVED,
      pack: { id: 'pack-1', created: false },
    });
  });

  it('a double click saves once: the second claim loses and is refused as not pending', async () => {
    const { service, client } = setup({});

    const results = await Promise.allSettled([
      service.confirm('u1', 'a-msg', memoryOnly),
      service.confirm('u1', 'a-msg', memoryOnly),
    ]);

    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'CONTEXT_SAVE_NOT_PENDING' },
    });
  });

  it('a confirm after the save went through returns the record without saving again', async () => {
    const { service, client } = setup({});

    await service.confirm('u1', 'a-msg', memoryOnly);
    const again = await service.confirm('u1', 'a-msg', memoryOnly);

    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(again.status).toBe(ContextSaveStatus.SAVED);
  });

  it("another user's message is a 404, and nothing is saved", async () => {
    const { service, client, transition } = setup({ owner: 'someone-else' });

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    await expect(service.dismiss('u1', 'a-msg')).rejects.toBeInstanceOf(EntityNotFoundException);
    expect(client.saveMemory).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it('a message with no proposal waiting is a 409', async () => {
    const { service, client } = setup({ record: { status: ContextSaveStatus.DISMISSED } });

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
    expect(client.saveMemory).not.toHaveBeenCalled();
  });

  it('a failed save puts the card back to PROPOSED with the error code, edits kept', async () => {
    const { service, stored, client } = setup({ memoryOk: false });
    const edited = 'Edited sentence.';

    await expect(
      service.confirm('u1', 'a-msg', { memory: { type: 'FACT', text: edited }, pack: null }),
    ).rejects.toMatchObject({ code: 'CONTEXT_SAVE_UNAVAILABLE' });

    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(stored().contextSave).toMatchObject({
      status: ContextSaveStatus.PROPOSED,
      proposalError: 'CONTEXT_SAVE_UNAVAILABLE',
      proposal: { memory: { type: 'FACT', text: edited } },
    });
    expect(stored().contextSave?.['memory']).toBeUndefined();
  });

  it('after a failure the user can confirm again and it saves', async () => {
    const { service, client } = setup({ memoryOk: true });
    client.saveMemory
      .mockResolvedValueOnce({ ok: false, reason: 'LIMIT' })
      .mockResolvedValueOnce({ ok: true, value: { id: 'mem-2', content: 'x', created: true } });

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toMatchObject({
      code: 'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED',
    });
    const retry = await service.confirm('u1', 'a-msg', memoryOnly);

    expect(retry).toMatchObject({ status: ContextSaveStatus.SAVED, memory: { id: 'mem-2' } });
    expect(retry.proposalError).toBeUndefined();
  });

  it('when only the pack fails the memory stays saved and a retry saves only the pack', async () => {
    const { service, client } = setup({ packOk: false });
    const both: ContextSaveProposalConfirmDto = {
      memory: { type: 'FACT', text: 'A fact.' },
      pack: { packId: null, newPackName: 'Diet', content: 'Diet notes' },
    };

    const partial = await service.confirm('u1', 'a-msg', both);

    expect(partial).toMatchObject({
      status: ContextSaveStatus.PROPOSED,
      memory: { id: 'mem-1' },
      proposalError: 'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED',
      proposal: { memory: null, pack: { content: 'Diet notes', newPackName: 'Diet' } },
    });

    client.createPack.mockResolvedValueOnce({
      ok: true,
      value: { id: 'pack-new', name: 'Diet', created: true },
    });
    const done = await service.confirm('u1', 'a-msg', {
      memory: null,
      pack: both.pack,
    });

    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(done).toMatchObject({
      status: ContextSaveStatus.SAVED,
      memory: { id: 'mem-1' },
      pack: { id: 'pack-new' },
    });
  });
});

describe('ContextSaveProposalService.dismiss (ADR-168)', () => {
  it('marks the record DISMISSED and clears the proposal, saving nothing', async () => {
    const { service, stored, client } = setup({});

    const result = await service.dismiss('u1', 'a-msg');

    expect(result.status).toBe(ContextSaveStatus.DISMISSED);
    expect(result.proposal).toBeUndefined();
    expect(stored().contextSave).toMatchObject({ status: ContextSaveStatus.DISMISSED });
    expect(client.saveMemory).not.toHaveBeenCalled();
  });

  it('is idempotent: a second dismiss returns the same record', async () => {
    const { service } = setup({});

    const first = await service.dismiss('u1', 'a-msg');
    const second = await service.dismiss('u1', 'a-msg');

    expect(second).toEqual(first);
  });

  it('never undoes a save that already went through', async () => {
    const { service, client } = setup({});
    await service.confirm('u1', 'a-msg', memoryOnly);

    const result = await service.dismiss('u1', 'a-msg');

    expect(result.status).toBe(ContextSaveStatus.SAVED);
    expect(client.saveMemory).toHaveBeenCalledTimes(1);
  });

  it('a dismissed proposal cannot be confirmed afterwards', async () => {
    const { service, client } = setup({});
    await service.dismiss('u1', 'a-msg');

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
    expect(client.saveMemory).not.toHaveBeenCalled();
  });
});

describe('contextSaveProposalConfirmSchema', () => {
  const parse = (value: unknown): boolean =>
    contextSaveProposalConfirmSchema.safeParse(value).success;

  it('needs at least one of memory or pack', () => {
    expect(parse({ memory: null, pack: null })).toBe(false);
    expect(parse({})).toBe(false);
    expect(parse({ memory: { type: 'FACT', text: 'ok' } })).toBe(true);
  });

  it('a pack names an existing pack XOR a new one', () => {
    expect(parse({ pack: { packId: 'p1', newPackName: null, content: 'x' } })).toBe(true);
    expect(parse({ pack: { packId: null, newPackName: 'New', content: 'x' } })).toBe(true);
    expect(parse({ pack: { packId: 'p1', newPackName: 'New', content: 'x' } })).toBe(false);
    expect(parse({ pack: { packId: null, newPackName: null, content: 'x' } })).toBe(false);
  });

  it('bounds the text and refuses blank text and unknown types', () => {
    expect(
      parse({ memory: { type: 'FACT', text: 'x'.repeat(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS + 1) } }),
    ).toBe(false);
    expect(
      parse({ memory: { type: 'FACT', text: 'x'.repeat(SAVE_INTENT_SUMMARY_MAX_CHARS) } }),
    ).toBe(true);
    expect(parse({ memory: { type: 'FACT', text: '   ' } })).toBe(false);
    expect(parse({ memory: { type: 'NOPE', text: 'ok' } })).toBe(false);
    expect(parse({ pack: { packId: 'p', newPackName: null, content: 'x'.repeat(250_001) } })).toBe(
      false,
    );
    expect(parse({ pack: { packId: null, newPackName: 'n'.repeat(121), content: 'x' } })).toBe(
      false,
    );
  });

  it('keeps the text exactly as sent', () => {
    const parsed = contextSaveProposalConfirmSchema.parse({
      memory: { type: 'FACT', text: '  spaced  ' },
    });
    expect(parsed.memory?.text).toBe('  spaced  ');
  });
});

describe('ContextSaveProposalService — half saves and stable reason codes (ADR-168)', () => {
  const both: ContextSaveProposalConfirmDto = {
    memory: { type: 'FACT', text: 'A fact.' },
    pack: { packId: null, newPackName: 'Diet', content: 'Diet notes' },
  };

  it('keeps the saved half, empties its side of the proposal and names the failed half', async () => {
    const { service, stored } = setup({ packOk: false });

    const partial = await service.confirm('u1', 'a-msg', both);

    expect(partial.status).toBe(ContextSaveStatus.PROPOSED);
    expect(partial.memory).toMatchObject({ id: 'mem-1' });
    expect(partial.proposal?.memory).toBeNull();
    expect(partial.proposal?.pack).toMatchObject({ content: 'Diet notes' });
    expect(partial.packFailure).toBe('LIMIT');
    expect(partial.memoryFailure).toBeUndefined();
    expect(partial.proposalError).toBe('PLAN_CONTEXT_PACK_LIMIT_EXCEEDED');
    expect(stored().contextSave).toMatchObject({ proposalError: partial.proposalError });
  });

  it('the pack half saved and the memory half failed: pack side is null, memory kept for retry', async () => {
    const { service } = setup({ memoryOk: false });

    const partial = await service.confirm('u1', 'a-msg', both);

    expect(partial.pack).toMatchObject({ id: 'pack-new' });
    expect(partial.proposal?.pack).toBeNull();
    expect(partial.proposal?.memory).toMatchObject({ text: 'A fact.' });
    expect(partial.memoryFailure).toBe('UNAVAILABLE');
    expect(partial.proposalError).toBe('CONTEXT_SAVE_UNAVAILABLE');
  });

  it('never saves a half twice, even when the client sends it again', async () => {
    const { service, client } = setup({ packOk: false });
    await service.confirm('u1', 'a-msg', both);
    client.createPack.mockResolvedValueOnce({
      ok: true,
      value: { id: 'pack-new', name: 'Diet', created: true },
    });

    const done = await service.confirm('u1', 'a-msg', both);

    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(done.status).toBe(ContextSaveStatus.SAVED);
    expect(done.packFailure).toBeUndefined();
    expect(done.proposalError).toBeUndefined();
  });

  it('every proposalError a confirm reports is a documented code', async () => {
    for (const [memoryOk, packOk] of [
      [false, true],
      [true, false],
    ]) {
      const { service } = setup({ memoryOk, packOk });
      const partial = await service.confirm('u1', 'a-msg', both);
      expect(CONTEXT_SAVE_PROPOSAL_ERROR_CODES).toContain(partial.proposalError);
    }
  });
});

describe('ContextSaveProposalService — a record never stays SAVING (ADR-168)', () => {
  it('a throw after the claim restores PROPOSED and rethrows the error', async () => {
    const { service, stored, client } = setup({});
    client.saveMemory.mockRejectedValueOnce(new Error('socket hang up'));

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toThrow('socket hang up');

    expect(stored().contextSave).toMatchObject({
      status: ContextSaveStatus.PROPOSED,
      proposalError: 'CONTEXT_SAVE_UNAVAILABLE',
      memoryFailure: 'UNAVAILABLE',
      proposal: { memory: { text: 'The user is vegetarian.' } },
    });
    expect(stored().contextSave?.['savingSince']).toBeUndefined();
    const retry = await service.confirm('u1', 'a-msg', memoryOnly);
    expect(retry.status).toBe(ContextSaveStatus.SAVED);
  });

  it('a throw in the second half keeps the first half that already went through', async () => {
    const { service, stored, client } = setup({});
    client.createPack.mockRejectedValueOnce(new Error('boom'));

    await expect(
      service.confirm('u1', 'a-msg', {
        memory: { type: 'FACT', text: 'A fact.' },
        pack: { packId: null, newPackName: 'Diet', content: 'Diet notes' },
      }),
    ).rejects.toThrow('boom');

    expect(stored().contextSave).toMatchObject({
      status: ContextSaveStatus.PROPOSED,
      memory: { id: 'mem-1' },
      proposal: { memory: null, pack: { content: 'Diet notes' } },
    });
  });

  it('when only writing the final record fails, the released record is SAVED if both halves went through', async () => {
    const { service, stored, updateMetadata } = setup({});
    updateMetadata.mockRejectedValueOnce(new Error('db down'));

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toThrow('db down');

    expect(stored().contextSave).toMatchObject({
      status: ContextSaveStatus.SAVED,
      memory: { id: 'mem-1' },
    });
  });

  it('if even the release fails, the original error still surfaces', async () => {
    const { service, updateMetadata } = setup({});
    updateMetadata.mockRejectedValue(new Error('db down'));

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toThrow('db down');
  });

  const savingFor = (ms: number | null): Record<string, unknown> => ({
    ...proposedRecord,
    status: ContextSaveStatus.SAVING,
    ...(ms === null ? {} : { savingSince: new Date(Date.now() - ms).toISOString() }),
  });

  it('a SAVING record older than two minutes is treated as PROPOSED on the next confirm', async () => {
    const { service, client } = setup({ record: savingFor(CONTEXT_SAVE_SAVING_STALE_MS + 1_000) });

    const result = await service.confirm('u1', 'a-msg', memoryOnly);

    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(ContextSaveStatus.SAVED);
  });

  it('a SAVING record with no claim time is refused, never taken over non-atomically', async () => {
    const { service, client, transition } = setup({ record: savingFor(null) });

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
    expect(transition).not.toHaveBeenCalled();
    expect(client.saveMemory).not.toHaveBeenCalled();
  });

  it('a fresh SAVING record is somebody else working: refused as not pending', async () => {
    const { service, client } = setup({ record: savingFor(10_000) });

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
    expect(client.saveMemory).not.toHaveBeenCalled();
  });

  it('two tabs recovering the same abandoned record save once', async () => {
    const { service, client } = setup({ record: savingFor(CONTEXT_SAVE_SAVING_STALE_MS * 2) });

    const results = await Promise.allSettled([
      service.confirm('u1', 'a-msg', memoryOnly),
      service.confirm('u1', 'a-msg', memoryOnly),
    ]);

    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('a claim stamps savingSince on the stored record while it is SAVING', async () => {
    const { service, transition } = setup({});

    await service.confirm('u1', 'a-msg', memoryOnly);

    const claimDoc = transition.mock.calls[0]?.[2] as { contextSave: Record<string, unknown> };
    expect(claimDoc.contextSave['status']).toBe(ContextSaveStatus.SAVING);
    expect(typeof claimDoc.contextSave['savingSince']).toBe('string');
  });
});

const halfSavedRecord = {
  ...proposedRecord,
  memory: { id: 'mem-0', type: 'FACT', preview: 'A fact', link: '/memory?id=mem-0' },
  proposal: { ...proposedRecord.proposal, memory: null },
};

describe('ContextSaveProposalService — a half saved earlier (ADR-168)', () => {
  it('a throw on retry does not re-offer or fail the memory that an earlier confirm saved', async () => {
    const { service, stored, client } = setup({ record: halfSavedRecord });
    client.createPack.mockRejectedValueOnce(new Error('boom'));

    await expect(
      service.confirm('u1', 'a-msg', {
        memory: { type: 'FACT', text: 'A fact.' },
        pack: { packId: null, newPackName: 'Diet', content: 'Diet notes' },
      }),
    ).rejects.toThrow('boom');

    expect(client.saveMemory).not.toHaveBeenCalled();
    expect(stored().contextSave).toMatchObject({
      status: ContextSaveStatus.PROPOSED,
      memory: { id: 'mem-0' },
      packFailure: 'UNAVAILABLE',
      proposal: { memory: null, pack: { content: 'Diet notes' } },
    });
    expect(stored().contextSave?.['memoryFailure']).toBeUndefined();
  });

  it('dismissing settles as SAVED, keeps the saved half and drops only the proposal', async () => {
    const { service, stored } = setup({ record: halfSavedRecord });

    const result = await service.dismiss('u1', 'a-msg');

    expect(result.status).toBe(ContextSaveStatus.SAVED);
    expect(result.memory).toMatchObject({ id: 'mem-0' });
    expect(result.proposal).toBeUndefined();
    expect(stored().contextSave).toMatchObject({ status: ContextSaveStatus.SAVED });
  });

  it('dismissing a pack-only half also settles as SAVED', async () => {
    const { service } = setup({
      record: {
        ...proposedRecord,
        pack: { id: 'p', name: 'Diet', created: true, link: '/context?id=p' },
      },
    });

    expect((await service.dismiss('u1', 'a-msg')).status).toBe(ContextSaveStatus.SAVED);
  });
});

describe('ContextSaveProposalService — DISMISSED is terminal', () => {
  it('a DISMISSED record is neither confirmable nor claimable, and dismiss returns it as is', async () => {
    const { service, client, transition } = setup({
      record: { status: ContextSaveStatus.DISMISSED, sourceMessageId: 'u-msg' },
    });

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
    const again = await service.dismiss('u1', 'a-msg');

    expect(again.status).toBe(ContextSaveStatus.DISMISSED);
    expect(client.saveMemory).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it('even a DISMISSED record that still carries a proposal is not confirmable', async () => {
    const { service, client } = setup({
      record: { ...proposedRecord, status: ContextSaveStatus.DISMISSED },
    });

    await expect(service.confirm('u1', 'a-msg', memoryOnly)).rejects.toMatchObject({
      code: 'CONTEXT_SAVE_NOT_PENDING',
    });
    expect(client.saveMemory).not.toHaveBeenCalled();
  });
});
