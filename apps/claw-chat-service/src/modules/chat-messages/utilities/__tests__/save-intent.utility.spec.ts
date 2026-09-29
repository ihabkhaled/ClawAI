import { ContextSaveStatus, MemoryRecordType, SaveContentSource } from '../../../../common/enums';
import {
  buildSaveIntentPrompt,
  contextSaveModelNote,
  mightBeSaveRequest,
  packContentFor,
  parseSaveIntentVerdict,
} from '../save-intent.utility';
import { withContextSaveNote } from '../context-save-note.utility';
import { type AssembledContext } from '../../types/context.types';

describe('mightBeSaveRequest — the recall net, not the decision', () => {
  it.each([
    'Please remember that I am vegetarian',
    'keep in mind I work at night',
    'add this to my context pack',
    'تذكر أنني نباتي',
    '私がベジタリアンだと覚えておいて',
    'запомни, что я вегетарианец',
    '记住我是素食者',
  ])('asks the planner about %s', (text) => {
    expect(mightBeSaveRequest(text)).toBe(true);
  });

  it.each([
    'What is the capital of Peru?',
    'How do I restore a database backup?',
    'จำเป็นต้องใช้วีซ่าไหม',
    'Ich habe bemerkt, dass es regnet',
  ])('does not ask about an ordinary message: %s', (text) => {
    expect(mightBeSaveRequest(text)).toBe(false);
  });
});

describe('parseSaveIntentVerdict', () => {
  it('accepts the agreed JSON, even wrapped in prose', () => {
    const verdict = parseSaveIntentVerdict(
      'Sure: {"save": true, "memory": {"type": "FACT", "text": "Works nights."}, "contextPack": null}',
    );

    expect(verdict).toEqual({
      save: true,
      memory: { type: MemoryRecordType.FACT, text: 'Works nights.' },
      contextPack: null,
    });
  });

  it('rejects an unknown memory type or broken JSON as "no answer"', () => {
    expect(
      parseSaveIntentVerdict('{"save": true, "memory": {"type": "GOSSIP", "text": "x"}}'),
    ).toBeNull();
    expect(parseSaveIntentVerdict('not json')).toBeNull();
  });
});

describe('packContentFor', () => {
  it('keeps the previous message whole (rule 57 §1)', () => {
    const long = 'x'.repeat(10_000);
    expect(packContentFor(SaveContentSource.PREVIOUS_MESSAGE, 'save this', long, null)).toBe(long);
  });

  it('uses the summary only when a summary was asked for', () => {
    expect(packContentFor(SaveContentSource.SUMMARY, 'u', 'p', 'the summary')).toBe('the summary');
    expect(packContentFor(SaveContentSource.USER_TEXT, 'user words', 'p', 'ignored')).toBe(
      'user words',
    );
  });
});

describe('prompt and note', () => {
  it('shows the planner the user packs, the previous message and the request', () => {
    const prompt = buildSaveIntentPrompt({
      userText: 'add this to Trips',
      previousText: 'Day 1: Eiffel',
      packNames: ['Trips'],
    });

    expect(prompt).toContain('- Trips');
    expect(prompt).toContain('Day 1: Eiffel');
    expect(prompt).toContain('add this to Trips');
  });

  it('tells the answering model what was done and which link to give', () => {
    const note = contextSaveModelNote({
      status: ContextSaveStatus.SAVED,
      memory: {
        id: 'm',
        type: MemoryRecordType.FACT,
        preview: 'Works nights.',
        link: '/memory?memoryId=m',
      },
    });

    expect(note).toContain('already done');
    expect(note).toContain('/memory?memoryId=m');
  });

  it('appends the note to the system prompt, or uses it alone', () => {
    const base = { systemPrompt: 'Be concise.' } as AssembledContext;

    expect(withContextSaveNote(base, 'NOTE').systemPrompt).toBe('Be concise.\n\nNOTE');
    expect(withContextSaveNote({ ...base, systemPrompt: null }, 'NOTE').systemPrompt).toBe('NOTE');
  });
});
