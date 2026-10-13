import { ContextSaveStatus, MemoryRecordType, SaveContentSource } from '../../../../common/enums';
import type { SaveIntentVerdict } from '../../dto/save-intent-verdict.dto';
import { contextSaveModelNote } from '../save-intent.utility';
import { SaveIntentTarget, type SaveToContextIntent } from '@claw/shared-utilities';
import {
  SAVE_INTENT_MEMORY_TEXT_MAX_CHARS,
  SAVE_INTENT_PACK_NAME_MAX_CHARS,
  SAVE_PACK_CHOICE_MAX_OPTIONS,
} from '../../constants/save-intent.constants';
import {
  buildKeywordSaveProposal,
  buildSaveProposal,
  contextSaveModeOf,
} from '../save-proposal.utility';

const packs = [
  { id: 'p1', name: 'Trips', itemCount: 2 },
  { id: 'p2', name: 'Health', itemCount: 0 },
];

describe('contextSaveModeOf (ADR-168)', () => {
  it('defaults to ASK', () => {
    expect(contextSaveModeOf({ metadata: null })).toBe('ASK');
    expect(contextSaveModeOf({ metadata: {} })).toBe('ASK');
    expect(contextSaveModeOf({ metadata: [] })).toBe('ASK');
    expect(contextSaveModeOf({ metadata: 'AUTO' })).toBe('ASK');
  });

  it('is AUTO only when the client said exactly AUTO', () => {
    expect(contextSaveModeOf({ metadata: { contextSaveMode: 'AUTO' } })).toBe('AUTO');
    expect(contextSaveModeOf({ metadata: { contextSaveMode: 'auto' } })).toBe('ASK');
    expect(contextSaveModeOf({ metadata: { contextSaveMode: 'ASK' } })).toBe('ASK');
    expect(contextSaveModeOf({ metadata: { contextSaveMode: true } })).toBe('ASK');
  });
});

describe('buildSaveProposal', () => {
  const verdict = (overrides: Partial<SaveIntentVerdict>): SaveIntentVerdict => ({
    save: true,
    memory: null,
    contextPack: null,
    ...overrides,
  });

  it('copies the memory type and sentence and lists the owner packs as options', () => {
    const proposal = buildSaveProposal({
      verdict: verdict({ memory: { type: MemoryRecordType.FACT, text: 'Works nights.' } }),
      userText: 'remember I work nights',
      previousText: '',
      packs,
    });

    expect(proposal).toEqual({
      memory: { type: 'FACT', text: 'Works nights.' },
      pack: null,
      options: [
        { id: 'p1', name: 'Trips', itemCount: 2 },
        { id: 'p2', name: 'Health', itemCount: 0 },
      ],
    });
  });

  it('matches a named pack case-insensitively and keeps the previous message whole', () => {
    const previous = '  Day 1: Eiffel.\n\nDay 2: Louvre.  ';
    const proposal = buildSaveProposal({
      verdict: verdict({
        contextPack: {
          source: SaveContentSource.PREVIOUS_MESSAGE,
          summary: null,
          packName: 'tRiPs',
          newPackName: null,
        },
      }),
      userText: 'add this to trips',
      previousText: previous,
      packs,
    });

    expect(proposal.pack).toEqual({
      source: 'PREVIOUS_MESSAGE',
      content: previous.trim(),
      packId: 'p1',
      packName: 'Trips',
      newPackName: null,
    });
  });

  it('an unmatched pack name becomes the new pack name', () => {
    const proposal = buildSaveProposal({
      verdict: verdict({
        contextPack: {
          source: SaveContentSource.USER_TEXT,
          summary: null,
          packName: 'Recipes',
          newPackName: null,
        },
      }),
      userText: 'add this to my Recipes pack: pasta, tomato, basil',
      previousText: '',
      packs,
    });

    expect(proposal.pack).toMatchObject({ packId: null, packName: null, newPackName: 'Recipes' });
  });

  it('with no name at all the new pack is named from the content', () => {
    const proposal = buildSaveProposal({
      verdict: verdict({
        contextPack: {
          source: SaveContentSource.USER_TEXT,
          summary: null,
          packName: null,
          newPackName: null,
        },
      }),
      userText: 'Pasta night notes for Friday',
      previousText: '',
      packs: [],
    });

    expect(proposal.pack?.newPackName).toBeTruthy();
    expect(proposal.options).toEqual([]);
  });

  it('caps the options the form offers', () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      id: `p${String(index)}`,
      name: `Pack ${String(index)}`,
      itemCount: 0,
    }));
    const proposal = buildSaveProposal({
      verdict: verdict({ memory: { type: MemoryRecordType.FACT, text: 'x' } }),
      userText: 'remember x',
      previousText: '',
      packs: many,
    });
    expect(proposal.options).toHaveLength(20);
  });
});

describe('contextSaveModelNote for a proposal (ADR-168)', () => {
  it('says the save is pending, claims nothing, and gives no link', () => {
    const note = contextSaveModelNote({
      status: ContextSaveStatus.PROPOSED,
      proposal: {
        memory: { type: 'FACT', text: 'The user works night shifts.' },
        pack: null,
        options: [],
      },
    });

    expect(note).toContain('PENDING');
    expect(note).toContain('NOTHING has been saved');
    expect(note).toContain('Do NOT say it was saved');
    expect(note).toContain('The user works night shifts.');
    expect(note).not.toMatch(/already done|\/memory\?|\/context\?/u);
  });

  it('a dismissed record says nothing was saved', () => {
    expect(contextSaveModelNote({ status: ContextSaveStatus.DISMISSED })).toContain(
      'NOTHING was saved',
    );
  });

  it('a saved record still reads as done', () => {
    const note = contextSaveModelNote({
      status: ContextSaveStatus.SAVED,
      memory: { id: 'm', type: MemoryRecordType.FACT, preview: 'x', link: '/memory?memoryId=m' },
    });
    expect(note).toContain('already done');
    expect(note).not.toContain('PENDING');
  });
});

describe('buildSaveProposal — the named pack is always offered', () => {
  const manyPacks = Array.from({ length: SAVE_PACK_CHOICE_MAX_OPTIONS + 5 }, (_, index) => ({
    id: `p${String(index)}`,
    name: `Pack ${String(index)}`,
    itemCount: index,
  }));
  const named = (packName: string): SaveIntentVerdict => ({
    save: true,
    memory: null,
    contextPack: {
      source: SaveContentSource.USER_TEXT,
      summary: null,
      packName,
      newPackName: null,
    },
  });

  it('appends a named pack that falls beyond the first options', () => {
    const last = manyPacks.at(-1);
    const proposal = buildSaveProposal({
      verdict: named('pack 24'),
      userText: 'x',
      previousText: '',
      packs: manyPacks,
    });

    expect(last?.id).toBe('p24');
    expect(proposal.options).toHaveLength(SAVE_PACK_CHOICE_MAX_OPTIONS + 1);
    expect(proposal.options.at(-1)).toEqual({ id: 'p24', name: 'Pack 24', itemCount: 24 });
    expect(proposal.pack?.packId).toBe('p24');
  });

  it('does not duplicate a named pack that is already among the options', () => {
    const proposal = buildSaveProposal({
      verdict: named('Pack 3'),
      userText: 'x',
      previousText: '',
      packs: manyPacks,
    });

    expect(proposal.options).toHaveLength(SAVE_PACK_CHOICE_MAX_OPTIONS);
    expect(proposal.options.filter((option) => option.id === 'p3')).toHaveLength(1);
  });

  it('stays at the cap when no pack was named', () => {
    const proposal = buildSaveProposal({
      verdict: named('A pack that does not exist'),
      userText: 'x',
      previousText: '',
      packs: manyPacks,
    });

    expect(proposal.options).toHaveLength(SAVE_PACK_CHOICE_MAX_OPTIONS);
    expect(proposal.pack?.packId).toBeNull();
    expect(proposal.pack?.newPackName).toBe('A pack that does not exist');
  });
});

describe('buildSaveProposal — the planner output fits the confirm limits', () => {
  it('clamps a memory sentence and a pack name to the numbers the confirm enforces', () => {
    const proposal = buildSaveProposal({
      verdict: {
        save: true,
        memory: {
          type: MemoryRecordType.SUMMARY,
          text: 'm'.repeat(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS + 50),
        },
        contextPack: {
          source: SaveContentSource.USER_TEXT,
          summary: null,
          packName: null,
          newPackName: 'n'.repeat(SAVE_INTENT_PACK_NAME_MAX_CHARS + 50),
        },
      },
      userText: 'x',
      previousText: '',
      packs: [],
    });

    expect(proposal.memory?.text).toHaveLength(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS);
    expect(proposal.pack?.newPackName).toHaveLength(SAVE_INTENT_PACK_NAME_MAX_CHARS);
  });

  it('keeps the pack text whole, however long (rule 57 section 1)', () => {
    const long = 'word '.repeat(5_000);
    const proposal = buildSaveProposal({
      verdict: {
        save: true,
        memory: null,
        contextPack: {
          source: SaveContentSource.PREVIOUS_MESSAGE,
          summary: null,
          packName: null,
          newPackName: null,
        },
      },
      userText: 'save this',
      previousText: long,
      packs: [],
    });

    expect(proposal.pack?.content).toBe(long.trim());
  });
});

describe('buildKeywordSaveProposal', () => {
  const memoryIntent: SaveToContextIntent = {
    target: SaveIntentTarget.MEMORY,
    memoryType: 'PREFERENCE',
    content: 'I like tea',
  };

  it('proposes a memory from the whole user text with the keyword-guessed type', () => {
    const proposal = buildKeywordSaveProposal({
      intent: memoryIntent,
      userText: 'Remember this: I like tea',
      previousText: 'ignored',
      packs,
    });

    expect(proposal).toEqual({
      memory: { type: 'PREFERENCE', text: 'Remember this: I like tea' },
      pack: null,
      options: [
        { id: 'p1', name: 'Trips', itemCount: 2 },
        { id: 'p2', name: 'Health', itemCount: 0 },
      ],
    });
  });

  it('proposes a pack, named from the content, when the command targets a pack', () => {
    const proposal = buildKeywordSaveProposal({
      intent: { ...memoryIntent, target: SaveIntentTarget.CONTEXT_PACK },
      userText: 'Add to my pack:\n# Plan\nDay 1',
      previousText: '',
      packs: [],
    });

    expect(proposal?.memory).toBeNull();
    expect(proposal?.pack).toEqual({
      source: 'USER_TEXT',
      content: 'Add to my pack:\n# Plan\nDay 1',
      packId: null,
      packName: null,
      newPackName: 'Plan',
    });
  });

  it('a bare command takes the message before it, as a pack when it is a pack command', () => {
    const proposal = buildKeywordSaveProposal({
      intent: { target: SaveIntentTarget.CONTEXT_PACK, memoryType: 'FACT', content: '' },
      userText: 'Save this as context',
      previousText: 'The whole earlier answer.',
      packs: [],
    });

    expect(proposal?.pack).toMatchObject({
      source: 'PREVIOUS_MESSAGE',
      content: 'The whole earlier answer.',
    });
  });

  it('moves a memory the form cannot hold into a pack, kept whole', () => {
    const text = 'a '.repeat(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS);
    const proposal = buildKeywordSaveProposal({
      intent: memoryIntent,
      userText: text,
      previousText: '',
      packs: [],
    });

    expect(proposal?.memory).toBeNull();
    expect(proposal?.pack?.content).toBe(text.trim());
    expect(proposal?.pack?.newPackName?.length).toBeLessThanOrEqual(
      SAVE_INTENT_PACK_NAME_MAX_CHARS,
    );
  });

  it('is null when there is nothing to save', () => {
    expect(
      buildKeywordSaveProposal({
        intent: { ...memoryIntent, content: '' },
        userText: 'Save this',
        previousText: '   ',
        packs,
      }),
    ).toBeNull();
  });
});
