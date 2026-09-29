import { type Mock, vi } from 'vitest';
import { ContextSaveStatus, MemoryRecordType, SaveContentSource } from '../../../../common/enums';
import { type ChatMessage } from '../../../../generated/prisma';
import { ContextSaveOrchestratorManager } from '../context-save-orchestrator.manager';
import type { ContextSaveClient } from '../../clients/context-save.client';
import type { ResearchGateService } from '../../services/research-gate.service';
import type { SaveToContextManager } from '../save-to-context.manager';
import type { SaveIntentVerdict } from '../../dto/save-intent-verdict.dto';

const row = (id: string, role: string, content: string): ChatMessage =>
  ({ id, threadId: 't1', role, content, metadata: null }) as ChatMessage;

function setup(options: {
  verdict?: SaveIntentVerdict | null;
  packs?: { id: string; name: string; itemCount: number }[];
  memoryOk?: boolean;
}): {
  manager: ContextSaveOrchestratorManager;
  askPlanner: Mock;
  client: Record<'saveMemory' | 'createPack' | 'addToPack' | 'listPacks', Mock>;
  trySave: Mock;
} {
  const askPlanner = vi
    .fn()
    .mockResolvedValue(options.verdict === undefined ? null : options.verdict);
  const client = {
    listPacks: vi.fn().mockResolvedValue(options.packs ?? []),
    saveMemory: vi
      .fn()
      .mockResolvedValue(
        options.memoryOk === false
          ? { ok: false, reason: 'LIMIT' }
          : { ok: true, value: { id: 'mem-1', content: 'x', created: true } },
      ),
    createPack: vi.fn().mockResolvedValue({
      ok: true,
      value: { id: 'pack-new', name: 'Paris plan', created: true },
    }),
    addToPack: vi.fn().mockResolvedValue({ ok: true, value: { id: 'pack-1', name: 'Trips' } }),
  };
  const trySave = vi.fn().mockResolvedValue({ kind: 'ASK' });
  const manager = new ContextSaveOrchestratorManager(
    { askPlanner } as unknown as ResearchGateService,
    client as unknown as ContextSaveClient,
    { trySave } as unknown as SaveToContextManager,
  );
  return { manager, askPlanner, client, trySave };
}

const memoryVerdict: SaveIntentVerdict = {
  save: true,
  memory: { type: MemoryRecordType.PREFERENCE, text: 'The user is vegetarian.' },
  contextPack: null,
};

describe('ContextSaveOrchestratorManager (ADR-133)', () => {
  it('does not ask the planner about an ordinary message', async () => {
    const { manager, askPlanner } = setup({ verdict: memoryVerdict });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'What is the capital of Peru?'),
    ]);

    expect(result).toBeNull();
    expect(askPlanner).not.toHaveBeenCalled();
  });

  it('lets the model say no — a question about memory saves nothing', async () => {
    const { manager, client } = setup({ verdict: { save: false } });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'What do you remember about me?'),
    ]);

    expect(result).toBeNull();
    expect(client.saveMemory).not.toHaveBeenCalled();
  });

  it('saves a memory with the type and sentence the model chose, and links it', async () => {
    const { manager, client } = setup({ verdict: memoryVerdict });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'Please remember that I am vegetarian'),
    ]);

    expect(client.saveMemory).toHaveBeenCalledWith({
      userId: 'u1',
      threadId: 't1',
      sourceMessageId: 'm1',
      type: MemoryRecordType.PREFERENCE,
      content: 'The user is vegetarian.',
    });
    expect(result).toMatchObject({
      kind: 'AI',
      record: {
        status: ContextSaveStatus.SAVED,
        memory: { id: 'mem-1', link: '/memory?memoryId=mem-1' },
      },
    });
    expect(result?.kind === 'AI' ? result.modelNote : '').toContain('/memory?memoryId=mem-1');
  });

  it('adds to the pack the user named, keeping the previous answer whole', async () => {
    const previous = 'Day 1: Eiffel. Day 2: Louvre.\n'.repeat(50);
    const { manager, client } = setup({
      verdict: {
        save: true,
        memory: null,
        contextPack: {
          source: SaveContentSource.PREVIOUS_MESSAGE,
          summary: null,
          packName: 'trips',
          newPackName: null,
        },
      },
      packs: [{ id: 'pack-1', name: 'Trips', itemCount: 2 }],
    });

    const result = await manager.handle('u1', 't1', [
      row('m0', 'ASSISTANT', previous),
      row('m1', 'USER', 'add this to my Trips context pack'),
    ]);

    expect(client.addToPack).toHaveBeenCalledWith({
      userId: 'u1',
      packId: 'pack-1',
      sourceMessageId: 'm1',
      content: previous.trim(),
    });
    expect(result).toMatchObject({ record: { pack: { id: 'pack-1', created: false } } });
  });

  it('asks which pack when none was named and the user has packs — nothing is guessed', async () => {
    const { manager, client } = setup({
      verdict: {
        save: true,
        memory: null,
        contextPack: {
          source: SaveContentSource.USER_TEXT,
          summary: null,
          packName: null,
          newPackName: 'Paris plan',
        },
      },
      packs: [{ id: 'pack-1', name: 'Trips', itemCount: 2 }],
    });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'save this to context: Paris plan...'),
    ]);

    expect(client.createPack).not.toHaveBeenCalled();
    expect(client.addToPack).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      record: {
        status: ContextSaveStatus.NEEDS_PACK_CHOICE,
        pending: {
          sourceMessageId: 'm1',
          suggestedName: 'Paris plan',
          options: [{ id: 'pack-1', name: 'Trips' }],
        },
      },
    });
  });

  it('creates a new pack when the user has none', async () => {
    const { manager, client } = setup({
      verdict: {
        save: true,
        memory: null,
        contextPack: {
          source: SaveContentSource.USER_TEXT,
          summary: null,
          packName: null,
          newPackName: 'Paris plan',
        },
      },
    });

    await manager.handle('u1', 't1', [row('m1', 'USER', 'save this to context: Paris plan...')]);

    expect(client.createPack).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Paris plan',
        content: 'save this to context: Paris plan...',
      }),
    );
  });

  it('saves to BOTH when asked for both', async () => {
    const { manager, client } = setup({
      verdict: {
        ...memoryVerdict,
        contextPack: {
          source: SaveContentSource.USER_TEXT,
          summary: null,
          packName: null,
          newPackName: 'Diet',
        },
      },
    });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'remember this and add it to context: vegetarian'),
    ]);

    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(client.createPack).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ record: { status: ContextSaveStatus.SAVED } });
  });

  it('reports a failed save instead of claiming success', async () => {
    const { manager } = setup({ verdict: memoryVerdict, memoryOk: false });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'remember I am vegetarian'),
    ]);

    expect(result).toMatchObject({
      record: { status: ContextSaveStatus.FAILED, memoryFailure: 'LIMIT' },
    });
    expect(result?.kind === 'AI' ? result.modelNote : '').toContain('FAILED');
  });

  it('falls back to the keyword path when no planner answers', async () => {
    const { manager, trySave } = setup({ verdict: null });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'remember this: I am vegetarian'),
    ]);

    expect(trySave).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ kind: 'LEGACY', outcome: { kind: 'ASK' } });
  });

  it('refuses text longer than one pack item as LIMIT — never cut, never parked', async () => {
    const huge = 'x'.repeat(250_001);
    const { manager, client } = setup({
      verdict: {
        save: true,
        memory: null,
        contextPack: {
          source: SaveContentSource.PREVIOUS_MESSAGE,
          summary: null,
          packName: null,
          newPackName: 'Big',
        },
      },
      packs: [{ id: 'pack-1', name: 'Trips', itemCount: 1 }],
    });

    const result = await manager.handle('u1', 't1', [
      row('m0', 'ASSISTANT', huge),
      row('m1', 'USER', 'save this to my context'),
    ]);

    expect(result).toMatchObject({
      record: { status: ContextSaveStatus.FAILED, packFailure: 'LIMIT' },
    });
    expect(client.createPack).not.toHaveBeenCalled();
  });
});
