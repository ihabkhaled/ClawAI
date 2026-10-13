import { type Mock, vi } from 'vitest';
import { ContextSaveStatus, MemoryRecordType, SaveContentSource } from '../../../../common/enums';
import { type ChatMessage } from '../../../../generated/prisma';
import { ContextSaveOrchestratorManager } from '../context-save-orchestrator.manager';
import type { ContextSaveClient } from '../../clients/context-save.client';
import type { ResearchGateService } from '../../services/research-gate.service';
import type { SaveToContextManager } from '../save-to-context.manager';
import type { SaveIntentVerdict } from '../../dto/save-intent-verdict.dto';

// User turns save at once (AUTO) unless a test passes null: the default is ASK (ADR-168).
const row = (
  id: string,
  role: string,
  content: string,
  metadata: Record<string, unknown> | null = role === 'USER' ? { contextSaveMode: 'AUTO' } : null,
): ChatMessage => ({ id, threadId: 't1', role, content, metadata }) as ChatMessage;

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

describe('ContextSaveOrchestratorManager (ADR-134)', () => {
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

describe('ContextSaveOrchestratorManager — the command is never the material (rule 57 §17)', () => {
  const packVerdict = (source: SaveContentSource): SaveIntentVerdict => ({
    save: true,
    memory: null,
    contextPack: { source, summary: null, packName: null, newPackName: 'ClawAI' },
  });

  it('save all info about X as a context pack: nothing is saved, the model writes the material', async () => {
    const { manager, client } = setup({ verdict: packVerdict(SaveContentSource.USER_TEXT) });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'save all info about ClawAI as a context pack'),
    ]);

    expect(result).toBeNull();
    expect(client.createPack).not.toHaveBeenCalled();
    expect(client.addToPack).not.toHaveBeenCalled();
  });

  it('a bare "save this" with no previous message saves nothing', async () => {
    const { manager, client } = setup({ verdict: packVerdict(SaveContentSource.PREVIOUS_MESSAGE) });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'save this as a context pack'),
    ]);

    expect(result).toBeNull();
    expect(client.createPack).not.toHaveBeenCalled();
  });

  it('a memory sentence that only repeats the command is dropped', async () => {
    const { manager, client } = setup({
      verdict: {
        save: true,
        memory: { type: MemoryRecordType.FACT, text: 'Save all info about ClawAI to memory' },
        contextPack: null,
      },
    });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'save all info about ClawAI to memory'),
    ]);

    expect(result).toBeNull();
    expect(client.saveMemory).not.toHaveBeenCalled();
  });

  it('saves the previous assistant answer when there is one', async () => {
    const { manager, client } = setup({ verdict: packVerdict(SaveContentSource.PREVIOUS_MESSAGE) });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'tell me about ClawAI'),
      row('m2', 'ASSISTANT', 'ClawAI is a workspace where one person uses many AI models.'),
      row('m3', 'USER', 'save this as a context pack'),
    ]);

    expect(result?.kind).toBe('AI');
    expect(client.createPack).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'ClawAI is a workspace where one person uses many AI models.',
      }),
    );
  });

  it('keeps the memory half when only the pack half has no material', async () => {
    const { manager, client } = setup({
      verdict: {
        save: true,
        memory: { type: MemoryRecordType.PREFERENCE, text: 'The user is vegetarian.' },
        contextPack: {
          source: SaveContentSource.PREVIOUS_MESSAGE,
          summary: null,
          packName: null,
          newPackName: 'Diet',
        },
      },
    });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'remember I am vegetarian and save it as a context pack'),
    ]);

    expect(result?.kind).toBe('AI');
    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(client.createPack).not.toHaveBeenCalled();
  });
});

describe('ContextSaveOrchestratorManager — ASK proposes, AUTO saves (ADR-168)', () => {
  const packVerdict: SaveIntentVerdict = {
    save: true,
    memory: null,
    contextPack: {
      source: SaveContentSource.PREVIOUS_MESSAGE,
      summary: null,
      packName: 'trips',
      newPackName: null,
    },
  };
  const packs = [{ id: 'pack-1', name: 'Trips', itemCount: 2 }];

  it('ASK is the default: a memory verdict becomes a PROPOSED record and nothing is saved', async () => {
    const { manager, client } = setup({ verdict: memoryVerdict, packs });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'Please remember that I am vegetarian', null),
    ]);

    expect(client.saveMemory).not.toHaveBeenCalled();
    expect(client.createPack).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: 'AI',
      record: {
        status: ContextSaveStatus.PROPOSED,
        sourceMessageId: 'm1',
        proposal: {
          memory: { type: 'PREFERENCE', text: 'The user is vegetarian.' },
          pack: null,
          options: [{ id: 'pack-1', name: 'Trips', itemCount: 2 }],
        },
      },
    });
  });

  it('ASK pre-fills the pack from the previous answer and matches the named pack', async () => {
    const previous = 'Day 1: Eiffel. Day 2: Louvre.';
    const { manager, client } = setup({ verdict: packVerdict, packs });

    const result = await manager.handle('u1', 't1', [
      row('m0', 'ASSISTANT', previous),
      row('m1', 'USER', 'add this to my Trips pack', null),
    ]);

    expect(client.addToPack).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      record: {
        status: ContextSaveStatus.PROPOSED,
        proposal: {
          pack: {
            source: 'PREVIOUS_MESSAGE',
            content: previous,
            packId: 'pack-1',
            packName: 'Trips',
            newPackName: null,
          },
        },
      },
    });
  });

  it('ASK suggests a new pack name when the user named none', async () => {
    const { manager } = setup({
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
      packs,
    });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'save this to context: Paris plan...', null),
    ]);

    expect(result).toMatchObject({
      record: { proposal: { pack: { packId: null, newPackName: 'Paris plan' } } },
    });
  });

  it('an explicit contextSaveMode of ASK behaves like the default', async () => {
    const { manager, client } = setup({ verdict: memoryVerdict });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'remember I am vegetarian', { contextSaveMode: 'ASK' }),
    ]);

    expect(client.saveMemory).not.toHaveBeenCalled();
    expect(result).toMatchObject({ record: { status: ContextSaveStatus.PROPOSED } });
  });

  it('AUTO saves immediately, exactly as before', async () => {
    const { manager, client } = setup({ verdict: memoryVerdict });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'remember I am vegetarian', { contextSaveMode: 'AUTO' }),
    ]);

    expect(client.saveMemory).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ record: { status: ContextSaveStatus.SAVED } });
  });

  it('the answering model is told the proposal is pending and nothing was saved', async () => {
    const { manager } = setup({ verdict: memoryVerdict });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'remember I am vegetarian', null),
    ]);

    const note = result?.kind === 'AI' ? result.modelNote : '';
    expect(note).toContain('PENDING');
    expect(note).toContain('NOTHING has been saved');
    expect(note).not.toContain('already done');
    expect(note).not.toContain('/memory?memoryId');
  });

  it('ASK still lets the planner say no, and still guards the command-as-material rule', async () => {
    const no = setup({ verdict: { save: false } });
    expect(
      await no.manager.handle('u1', 't1', [row('m1', 'USER', 'what do you remember?', null)]),
    ).toBeNull();

    const guard = setup({
      verdict: {
        save: true,
        memory: null,
        contextPack: {
          source: SaveContentSource.USER_TEXT,
          summary: null,
          packName: null,
          newPackName: 'ClawAI',
        },
      },
    });
    expect(
      await guard.manager.handle('u1', 't1', [
        row('m1', 'USER', 'save all info about ClawAI as a context pack', null),
      ]),
    ).toBeNull();
  });

  it('a bare imperative proposes only when it answers an assistant message', async () => {
    const after = setup({ verdict: packVerdict, packs });
    const resultAfter = await after.manager.handle('u1', 't1', [
      row('m0', 'ASSISTANT', 'Here is the plan: ...'),
      row('m1', 'USER', 'Keep it', null),
    ]);
    expect(after.askPlanner).toHaveBeenCalledTimes(1);
    expect(resultAfter?.kind).toBe('AI');

    const alone = setup({ verdict: packVerdict, packs });
    await alone.manager.handle('u1', 't1', [row('m1', 'USER', 'Keep it', null)]);
    expect(alone.askPlanner).not.toHaveBeenCalled();
  });
});

describe('ContextSaveOrchestratorManager — no planner in ASK mode proposes, never saves (ADR-168)', () => {
  const packs = [{ id: 'pack-1', name: 'Trips', itemCount: 2 }];
  const askRow = (id: string, content: string): ChatMessage => row(id, 'USER', content, null);

  it('proposes a memory from the keyword command: whole user text, keyword-guessed type', async () => {
    const { manager, client, trySave } = setup({ verdict: null, packs });
    const text = 'Remember this: I am vegetarian';

    const result = await manager.handle('u1', 't1', [askRow('m1', text)]);

    expect(result).toMatchObject({
      kind: 'AI',
      record: {
        status: ContextSaveStatus.PROPOSED,
        sourceMessageId: 'm1',
        proposal: {
          memory: { type: 'FACT', text },
          pack: null,
          options: [{ id: 'pack-1', name: 'Trips', itemCount: 2 }],
        },
      },
    });
    expect(client.saveMemory).not.toHaveBeenCalled();
    expect(client.createPack).not.toHaveBeenCalled();
    expect(client.addToPack).not.toHaveBeenCalled();
    expect(trySave).not.toHaveBeenCalled();
  });

  it('guesses INSTRUCTION from the wording, like the keyword path does', async () => {
    const { manager } = setup({ verdict: null });

    const result = await manager.handle('u1', 't1', [
      askRow('m1', 'Remember this: always answer in French'),
    ]);

    expect(result?.kind === 'AI' ? result.record.proposal?.memory?.type : null).toBe('INSTRUCTION');
  });

  it('proposes a new pack when the command targets a context pack', async () => {
    const { manager } = setup({ verdict: null });
    const text = 'Add this to my context pack:\n# Paris plan\nDay 1: Eiffel';

    const result = await manager.handle('u1', 't1', [askRow('m1', text)]);

    expect(result?.kind === 'AI' ? result.record.proposal : null).toMatchObject({
      memory: null,
      pack: { source: 'USER_TEXT', content: text, packId: null, newPackName: 'Paris plan' },
    });
  });

  it('a memory too long for the form becomes a pack, kept whole', async () => {
    const { manager } = setup({ verdict: null });
    const text = `Remember this: ${'long note '.repeat(500)}`;

    const result = await manager.handle('u1', 't1', [askRow('m1', text)]);

    const proposal = result?.kind === 'AI' ? result.record.proposal : undefined;
    expect(proposal?.memory).toBeNull();
    expect(proposal?.pack?.content).toBe(text.trim());
  });

  it('a bare "save this as context" proposes the message before it as a pack', async () => {
    const { manager } = setup({ verdict: null });

    const result = await manager.handle('u1', 't1', [
      row('m0', 'ASSISTANT', 'Here is the full plan: day 1 Eiffel.'),
      askRow('m1', 'Save this as context'),
    ]);

    expect(result?.kind === 'AI' ? result.record.proposal?.pack : null).toMatchObject({
      source: 'PREVIOUS_MESSAGE',
      content: 'Here is the full plan: day 1 Eiffel.',
    });
  });

  it('a bare command with nothing above it asks a question instead of proposing', async () => {
    const { manager, client } = setup({ verdict: null });

    const result = await manager.handle('u1', 't1', [askRow('m1', 'Save this as context')]);

    expect(result).toEqual({ kind: 'LEGACY', outcome: { kind: 'ASK' } });
    expect(client.createPack).not.toHaveBeenCalled();
  });

  it('a message the keyword detector does not recognise proposes nothing', async () => {
    const { manager } = setup({ verdict: null });

    expect(await manager.handle('u1', 't1', [askRow('m1', 'From now on be brief')])).toBeNull();
  });

  it('tells the answering model the proposal is pending', async () => {
    const { manager } = setup({ verdict: null });

    const result = await manager.handle('u1', 't1', [askRow('m1', 'Remember this: I am vegan')]);

    expect(result?.kind === 'AI' ? result.modelNote : '').toContain('PENDING');
  });

  it('AUTO mode keeps the keyword save as before', async () => {
    const { manager, trySave } = setup({ verdict: null });

    const result = await manager.handle('u1', 't1', [
      row('m1', 'USER', 'Remember this: I am vegan'),
    ]);

    expect(trySave).toHaveBeenCalledTimes(1);
    expect(result?.kind).toBe('LEGACY');
  });
});
