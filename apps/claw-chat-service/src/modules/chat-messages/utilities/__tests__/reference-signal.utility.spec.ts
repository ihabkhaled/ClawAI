import { detectReferenceSignal } from '../reference-signal.utility';

describe('detectReferenceSignal', () => {
  /**
   * Every prompt below returned `false` from the regex this replaced, and a
   * `false` there is what removed the conversation from the prompt. They are
   * listed verbatim because they came from the failing scenarios, not from
   * imagination.
   */
  it.each([
    ['build it', 'BARE_IMPERATIVE'],
    ['implement it', 'BARE_IMPERATIVE'],
    ['do it', 'BARE_IMPERATIVE'],
    ['apply that', 'BARE_IMPERATIVE'],
    ['use option 3', 'ORDINAL_SELECTION'],
    ['make the backend now', 'BARE_IMPERATIVE'],
    ['turn your architecture into code', 'TEMPORAL_REFERENCE'],
    ['finish what we discussed', 'TEMPORAL_REFERENCE'],
    ['use the solution you recommended', 'TEMPORAL_REFERENCE'],
    ['create the final version', 'BARE_IMPERATIVE'],
    ['what did you recommend before?', 'TEMPORAL_REFERENCE'],
    ['Implement the architecture you recommended.', 'TEMPORAL_REFERENCE'],
    ['Repeat it back to me.', 'PRONOUN'],
    ['Remind me of the credential I mentioned earlier.', 'TEMPORAL_REFERENCE'],
    ['show me the schema again', 'DEFINITE_ARTIFACT'],
    ['pick the second one', 'ORDINAL_SELECTION'],
  ])('classifies %p as referential via %s', (prompt, expectedSignal) => {
    const signal = detectReferenceSignal(prompt);

    expect(signal.referential).toBe(true);
    expect(signal.signals).toContain(expectedSignal);
    expect(signal.strength).toBeGreaterThan(0);
  });

  it('still recognises the phrasings the old regex did catch', () => {
    for (const prompt of ['continue', 'again', 'based on that', 'rewrite it shorter']) {
      expect(detectReferenceSignal(prompt).referential).toBe(true);
    }
  });

  it('returns a neutral signal for an empty prompt rather than throwing', () => {
    expect(detectReferenceSignal('   ')).toEqual({
      referential: false,
      strength: 0,
      signals: [],
    });
  });

  it('caps strength at one when many detectors fire at once', () => {
    const signal = detectReferenceSignal(
      'now continue and implement the architecture you recommended earlier, option 2, using it',
    );

    expect(signal.strength).toBeLessThanOrEqual(1);
    expect(signal.signals.length).toBeGreaterThan(2);
  });

  it('does not claim a genuinely self-contained question is referential', () => {
    const signal = detectReferenceSignal(
      'Explain the CAP theorem to a new backend developer in three paragraphs, with an example of each failure mode.',
    );

    expect(signal.signals).not.toContain('PRONOUN');
    expect(signal.signals).not.toContain('BARE_IMPERATIVE');
  });
});
