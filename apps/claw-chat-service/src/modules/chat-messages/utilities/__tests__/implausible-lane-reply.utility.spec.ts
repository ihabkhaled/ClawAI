import { isImplausiblyShortLaneReply } from '../implausible-lane-reply.utility';

const LONG_PROMPT = 'Explique en detail pourquoi le ciel est bleu. '.repeat(8);

describe('isImplausiblyShortLaneReply', () => {
  it('flags the one-word "Une" lane that answered a long prompt (C06)', () => {
    expect(
      isImplausiblyShortLaneReply({
        content: 'Une',
        userPrompt: LONG_PROMPT,
        finishReason: 'stop',
      }),
    ).toBe(true);
  });

  it('accepts a short answer to a short question', () => {
    expect(
      isImplausiblyShortLaneReply({
        content: 'Oui',
        userPrompt: 'Is 17 prime?',
        finishReason: 'stop',
      }),
    ).toBe(false);
  });

  it('accepts a real answer to a long prompt', () => {
    expect(
      isImplausiblyShortLaneReply({
        content: 'Parce que la lumiere bleue est diffusee davantage.',
        userPrompt: LONG_PROMPT,
        finishReason: 'stop',
      }),
    ).toBe(false);
  });

  it('leaves a user Stop alone', () => {
    expect(
      isImplausiblyShortLaneReply({
        content: 'Un',
        userPrompt: LONG_PROMPT,
        finishReason: 'cancelled',
      }),
    ).toBe(false);
  });

  const PAD = ' Contexte supplementaire sans importance.'.repeat(8);
  it.each([
    'Reply with the single word OK.',
    'Answer yes or no: is it safe?',
    'أجب بكلمة واحدة فقط.',
    'Antworte mit einem Wort.',
    'Responde con una palabra.',
    'Réponds en un mot.',
    '一言で答えてください。',
    '请用一个字回答。',
  ])('accepts a one-word reply when the prompt asks for it: %s', (ask) => {
    expect(
      isImplausiblyShortLaneReply({
        content: 'OK',
        userPrompt: ask + PAD,
        finishReason: 'stop',
      }),
    ).toBe(false);
  });
});
