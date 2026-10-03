import { SaveIntentTarget } from '@claw/shared-utilities';
import { type Mock, vi } from 'vitest';
import { ContextSaveStatus, MemoryRecordType } from '../../../../common/enums';
import type { ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';
import type { ContextSaveClient } from '../../clients/context-save.client';
import { saveMessageToContextSchema } from '../../dto/save-message-to-context.dto';
import type { ChatMessagesRepository } from '../../repositories/chat-messages.repository';
import { MessageSaveToContextService } from '../message-save-to-context.service';

type ClientMocks = Record<'saveMemory' | 'createPack' | 'addToPack', Mock>;

function setup(options: { content?: string; owner?: string; found?: boolean; fail?: boolean }): {
  service: MessageSaveToContextService;
  client: ClientMocks;
} {
  const messages = {
    findById: vi.fn().mockResolvedValue(
      options.found === false
        ? null
        : {
            id: 'a-msg',
            threadId: 't1',
            role: 'ASSISTANT',
            content: options.content ?? '# ClawAI\nEvery AI, one workspace.',
          },
    ),
  } as unknown as ChatMessagesRepository;
  const threads = {
    findById: vi.fn().mockResolvedValue({ id: 't1', userId: options.owner ?? 'u1' }),
  } as unknown as ChatThreadsRepository;
  const failed = { ok: false, reason: 'LIMIT' };
  const client: ClientMocks = {
    saveMemory: vi
      .fn()
      .mockResolvedValue(
        options.fail === true
          ? failed
          : { ok: true, value: { id: 'mem-1', content: 'x', created: true } },
      ),
    createPack: vi
      .fn()
      .mockResolvedValue(
        options.fail === true
          ? failed
          : { ok: true, value: { id: 'pack-new', name: 'ClawAI', created: true } },
      ),
    addToPack: vi
      .fn()
      .mockResolvedValue({ ok: true, value: { id: 'pack-1', name: 'Product notes' } }),
  };
  return {
    service: new MessageSaveToContextService(
      messages,
      threads,
      client as unknown as ContextSaveClient,
    ),
    client,
  };
}

describe('MessageSaveToContextService', () => {
  it('creates a new pack named from the heading, keyed on the message id', async () => {
    const { service, client } = setup({});

    const record = await service.save('u1', 'a-msg', { target: SaveIntentTarget.CONTEXT_PACK });

    expect(client.createPack).toHaveBeenCalledWith({
      userId: 'u1',
      sourceMessageId: 'a-msg',
      name: 'ClawAI',
      content: '# ClawAI\nEvery AI, one workspace.',
    });
    expect(record).toMatchObject({
      status: ContextSaveStatus.SAVED,
      pack: { id: 'pack-new', created: true, link: '/context?packId=pack-new' },
    });
  });

  it('adds to the chosen existing pack instead of creating one', async () => {
    const { service, client } = setup({});

    const record = await service.save('u1', 'a-msg', {
      target: SaveIntentTarget.CONTEXT_PACK,
      packId: 'pack-1',
    });

    expect(client.createPack).not.toHaveBeenCalled();
    expect(client.addToPack).toHaveBeenCalledWith(
      expect.objectContaining({ packId: 'pack-1', sourceMessageId: 'a-msg' }),
    );
    expect(record.pack).toMatchObject({ id: 'pack-1', name: 'Product notes', created: false });
  });

  it('saves the whole message as a SUMMARY memory with a deep link', async () => {
    const { service, client } = setup({});

    const record = await service.save('u1', 'a-msg', { target: SaveIntentTarget.MEMORY });

    expect(client.saveMemory).toHaveBeenCalledWith({
      userId: 'u1',
      threadId: 't1',
      sourceMessageId: 'a-msg',
      type: MemoryRecordType.SUMMARY,
      content: '# ClawAI\nEvery AI, one workspace.',
    });
    expect(record.memory).toMatchObject({ id: 'mem-1', link: '/memory?memoryId=mem-1' });
  });

  it("answers 404 for someone else's message and saves nothing", async () => {
    const { service, client } = setup({ owner: 'someone-else' });

    await expect(
      service.save('u1', 'a-msg', { target: SaveIntentTarget.MEMORY }),
    ).rejects.toMatchObject({ message: expect.stringContaining('a-msg') });
    expect(client.saveMemory).not.toHaveBeenCalled();
  });

  it('refuses an empty message', async () => {
    const { service, client } = setup({ content: '   ' });

    await expect(
      service.save('u1', 'a-msg', { target: SaveIntentTarget.CONTEXT_PACK }),
    ).rejects.toMatchObject({ code: 'CONTEXT_SAVE_EMPTY_MESSAGE' });
    expect(client.createPack).not.toHaveBeenCalled();
  });

  it('maps a memory-service refusal to its plan-limit error code', async () => {
    const { service } = setup({ fail: true });

    await expect(
      service.save('u1', 'a-msg', { target: SaveIntentTarget.CONTEXT_PACK }),
    ).rejects.toMatchObject({ code: 'PLAN_CONTEXT_PACK_LIMIT_EXCEEDED' });
  });
});

describe('saveMessageToContextSchema', () => {
  it('accepts a pack id only with the context pack target', () => {
    expect(
      saveMessageToContextSchema.safeParse({ target: 'CONTEXT_PACK', packId: 'p1' }).success,
    ).toBe(true);
    expect(saveMessageToContextSchema.safeParse({ target: 'MEMORY', packId: 'p1' }).success).toBe(
      false,
    );
    expect(saveMessageToContextSchema.safeParse({ target: 'NOPE' }).success).toBe(false);
  });
});
