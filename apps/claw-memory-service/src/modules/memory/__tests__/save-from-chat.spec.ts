import { type Mock, vi } from 'vitest';
import { ContextPackItemType, MemorySource, MemoryType } from '../../../generated/prisma';
import { MemoryService } from '../services/memory.service';
import { MemorySensitivityManager } from '../managers/memory-sensitivity.manager';
import { saveMemoryFromChatSchema } from '../dto/save-memory-from-chat.dto';
import { ContextPacksService } from '../../context-packs/services/context-packs.service';
import { savePackFromChatSchema } from '../../context-packs/dto/save-pack-from-chat.dto';
import { SAVED_FROM_CHAT_TAG_PREFIX } from '../../context-packs/constants/context-packs-for-chat.constants';

function memoryService(repo: Record<string, Mock>): MemoryService {
  return new MemoryService(
    repo as never,
    {} as never,
    new MemorySensitivityManager(),
    { embedOne: vi.fn() } as never,
    {} as never,
    { record: vi.fn() } as never,
    {} as never,
    { publish: vi.fn(), subscribe: vi.fn() } as never,
    { resolve: vi.fn().mockResolvedValue({ isAdmin: true }) } as never,
  );
}

describe('MemoryService.saveFromChat (owner feature 11)', () => {
  const dto = saveMemoryFromChatSchema.parse({
    userId: 'u1',
    type: MemoryType.INSTRUCTION,
    content: 'Always answer in British English.',
    sourceThreadId: 't1',
    sourceMessageId: 'msg-1',
  });

  it('creates once, owner-scoped, with the chat provenance', async () => {
    const repo = {
      findBySourceMessage: vi.fn().mockResolvedValue(null),
      createWithinLimit: vi
        .fn()
        .mockImplementation(async (data: object) => ({ id: 'm1', ...data })),
    };
    const result = await memoryService(repo).saveFromChat(dto);
    expect(repo.findBySourceMessage).toHaveBeenCalledWith('u1', 'msg-1');
    expect(repo.createWithinLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: MemoryType.INSTRUCTION,
        content: 'Always answer in British English.',
        sourceMessageId: 'msg-1',
        source: MemorySource.USER_MANUAL,
      }),
      null,
    );
    expect(result.created).toBe(true);
  });

  it('is idempotent: a retry of the same message returns the existing memory', async () => {
    const existing = { id: 'm1', userId: 'u1', type: MemoryType.INSTRUCTION, content: 'x' };
    const repo = {
      findBySourceMessage: vi.fn().mockResolvedValue(existing),
      createWithinLimit: vi.fn(),
    };
    const result = await memoryService(repo).saveFromChat(dto);
    expect(result).toEqual({ memory: existing, created: false });
    expect(repo.createWithinLimit).not.toHaveBeenCalled();
  });

  it('rejects a payload above 250K characters', () => {
    expect(
      saveMemoryFromChatSchema.safeParse({ ...dto, content: 'a'.repeat(250_001) }).success,
    ).toBe(false);
  });
});

describe('ContextPacksService.saveFromChat (owner feature 11)', () => {
  const dto = savePackFromChatSchema.parse({
    userId: 'u1',
    name: 'Myoncare QA',
    content: '# Spec\n\nDocumentation Date cannot be in the future.',
    sourceMessageId: 'msg-9',
  });

  function packs(repo: Record<string, Mock>): ContextPacksService {
    return new ContextPacksService(
      repo as never,
      { publish: vi.fn() } as never,
      { embedItem: vi.fn() } as never,
      { resolve: vi.fn().mockResolvedValue({ isAdmin: true }) } as never,
    );
  }

  it('creates a USER-scope pack with one markdown item, tagged with the source message', async () => {
    const repo = {
      findByUserAndTag: vi.fn().mockResolvedValue(null),
      createWithinLimit: vi.fn().mockResolvedValue({ id: 'p1', userId: 'u1', name: 'Myoncare QA' }),
      findById: vi.fn().mockResolvedValue({ id: 'p1', userId: 'u1', items: [] }),
      addItem: vi.fn().mockResolvedValue({ id: 'i1' }),
    };
    const result = await packs(repo).saveFromChat(dto);
    expect(repo.findByUserAndTag).toHaveBeenCalledWith('u1', `${SAVED_FROM_CHAT_TAG_PREFIX}msg-9`);
    expect(repo.createWithinLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        name: 'Myoncare QA',
        tags: [`${SAVED_FROM_CHAT_TAG_PREFIX}msg-9`],
      }),
      null,
    );
    expect(repo.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ contextPackId: 'p1', itemType: ContextPackItemType.MARKDOWN }),
    );
    expect(result).toMatchObject({ created: true, packId: 'p1', name: 'Myoncare QA' });
  });

  it('is idempotent on retry', async () => {
    const repo = {
      findByUserAndTag: vi.fn().mockResolvedValue({ id: 'p1', name: 'Myoncare QA' }),
      createWithinLimit: vi.fn(),
      addItem: vi.fn(),
    };
    const result = await packs(repo).saveFromChat(dto);
    expect(result).toMatchObject({ created: false, packId: 'p1' });
    expect(repo.createWithinLimit).not.toHaveBeenCalled();
    expect(repo.addItem).not.toHaveBeenCalled();
  });
});
