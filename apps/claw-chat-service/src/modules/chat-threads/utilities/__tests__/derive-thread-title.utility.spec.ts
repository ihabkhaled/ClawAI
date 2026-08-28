import { deriveThreadTitle } from '../derive-thread-title.utility';

describe('deriveThreadTitle', () => {
  it('takes the opening sentence rather than a fixed number of characters', () => {
    // The shape threads shipped with: eighty characters cut mid-word, trailing
    // fragments of the next two instructions.
    const content =
      'Create ONE new file. Read NOTHING. No prose before the tool call. Use "create".';

    expect(deriveThreadTitle(content)).toBe('Create ONE new file');
  });

  it('drops a full stop but keeps a question mark', () => {
    // "Why is this failing?" names a different thread from a statement.
    expect(deriveThreadTitle('Why is this failing? It worked yesterday.')).toBe(
      'Why is this failing?',
    );
    expect(deriveThreadTitle('Fix the build. Then run the tests.')).toBe('Fix the build');
  });

  it('cuts a long sentence at a word boundary and says it was cut', () => {
    const title = deriveThreadTitle(
      'Refactor the entire authentication and authorization subsystem so that every service shares one predicate',
    );

    expect(title).not.toBeNull();
    expect(title?.endsWith('…')).toBe(true);
    expect(title?.length).toBeLessThanOrEqual(61);
    // Cut between words, so no half-word is left standing before the ellipsis.
    expect(title).not.toMatch(/\s…$/);
  });

  it('drops a fenced code block instead of naming the thread after it', () => {
    // A prompt that opens with code used to produce a title of braces.
    const content = '```ts\nconst x = 1;\n```\nExplain what this does.';

    expect(deriveThreadTitle(content)).toBe('Explain what this does');
  });

  it('keeps the words inside inline code', () => {
    expect(deriveThreadTitle('Why does `useEffect` run twice?')).toBe(
      'Why does useEffect run twice?',
    );
  });

  it('strips heading and emphasis marks', () => {
    expect(deriveThreadTitle('## **Deploy** the _new_ service')).toBe('Deploy the new service');
  });

  it('collapses newlines so a title stays one line', () => {
    expect(deriveThreadTitle('Fix\n\nthe   build')).toBe('Fix the build');
  });

  it('returns null when nothing usable survives', () => {
    // An empty title is better than a title made of backticks; the caller then
    // leaves the thread unnamed rather than naming it nonsense.
    expect(deriveThreadTitle('')).toBeNull();
    expect(deriveThreadTitle('   ')).toBeNull();
    expect(deriveThreadTitle('```\ncode only\n```')).toBeNull();
  });

  it('hard-cuts a language with no word boundaries rather than returning a stub', () => {
    // Japanese does not space its words, so there is no boundary to find. A
    // clean cut at the limit beats three characters and an ellipsis.
    const title = deriveThreadTitle('あ'.repeat(200));

    expect(title).not.toBeNull();
    expect(title?.length).toBe(61);
  });

  it('leaves a short prompt exactly as written', () => {
    expect(deriveThreadTitle('hello')).toBe('hello');
  });

  it('does not treat a decimal point as the end of a sentence', () => {
    // A version number mid-sentence would otherwise truncate the title there.
    expect(deriveThreadTitle('Upgrade to 1.2.3 and rerun the suite')).toBe(
      'Upgrade to 1.2.3 and rerun the suite',
    );
  });
});
