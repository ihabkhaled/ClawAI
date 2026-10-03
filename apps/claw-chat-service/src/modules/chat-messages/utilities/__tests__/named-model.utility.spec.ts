import type { ChatMessage } from '../../../../generated/prisma';
import type { AssembledContext } from '../../types/context.types';
import { CONTEXT_SAVE_TURN_MARKER } from '../../constants/save-intent.constants';
import {
  namedModelFields,
  namedModelNoticeNote,
  withNamedModelNotice,
  withNamedModelPrompt,
} from '../named-model.utility';
import { withSaveTurnNote } from '../context-save-note.utility';

const message = (id: string, role: string, content: string): ChatMessage =>
  ({ id, threadId: 't1', role, content, metadata: null }) as ChatMessage;

const context = (): AssembledContext =>
  ({
    userId: 'u1',
    systemPrompt: 'You are helpful.',
    threadMessages: [
      message('1', 'USER', 'first question'),
      message('2', 'ASSISTANT', 'first answer'),
      message('3', 'USER', 'use nano banana to make a poster of a lighthouse'),
    ],
  }) as unknown as AssembledContext;

describe('namedModelFields', () => {
  it('reads the stripped prompt and a valid notice', () => {
    expect(
      namedModelFields('Make a poster', {
        phrase: 'grok',
        provider: 'GROK',
        reason: 'NOT_IN_PLAN',
      }),
    ).toStrictEqual({
      namedModelPrompt: 'Make a poster',
      namedModelNotice: { phrase: 'grok', provider: 'GROK', reason: 'NOT_IN_PLAN' },
    });
  });

  it.each([
    [undefined, undefined],
    ['', null],
    [42, { phrase: 'grok' }],
    ['  ', { phrase: 'grok', provider: 'GROK', reason: 'toString' }],
  ])('ignores unreadable input (%s, %s)', (prompt, notice) => {
    expect(namedModelFields(prompt, notice)).toStrictEqual({});
  });
});

describe('withNamedModelPrompt', () => {
  it('the target model reads the task; only the last user turn changes', () => {
    const result = withNamedModelPrompt(context(), 'Make a poster of a lighthouse');
    expect(result.threadMessages.map((m) => m.content)).toStrictEqual([
      'first question',
      'first answer',
      'Make a poster of a lighthouse',
    ]);
  });

  it('leaves the context alone with no stripped prompt', () => {
    const original = context();
    expect(withNamedModelPrompt(original, undefined)).toBe(original);
  });
});

describe('named model notice', () => {
  const notice = { phrase: 'grok', provider: 'GROK', reason: 'NOT_IN_PLAN' } as const;

  it('tells the model to say so in one short sentence, naming the reason', () => {
    const note = namedModelNoticeNote(notice);
    expect(note).toContain('"grok"');
    expect(note).toContain("not included in the user's current plan");
    expect(note).toContain('Begin your reply with ONE short sentence');
  });

  it('rides in the system prompt and on the final user turn', () => {
    const result = withNamedModelNotice(context(), notice);
    expect(result.systemPrompt).toContain('PLATFORM NOTICE');
    expect(withSaveTurnNote('use grok to explain', result.saveTurnNote)).toContain(
      CONTEXT_SAVE_TURN_MARKER,
    );
  });

  it('keeps a save note beside the notice', () => {
    const saved = { ...context(), saveTurnNote: 'PLATFORM ACTION — saved' } as AssembledContext;
    expect(withNamedModelNotice(saved, notice).saveTurnNote).toContain('PLATFORM ACTION — saved');
    expect(withNamedModelNotice(saved, notice).saveTurnNote).toContain('PLATFORM NOTICE');
  });

  it('is a no-op without a notice', () => {
    const original = context();
    expect(withNamedModelNotice(original, undefined)).toBe(original);
  });
});
