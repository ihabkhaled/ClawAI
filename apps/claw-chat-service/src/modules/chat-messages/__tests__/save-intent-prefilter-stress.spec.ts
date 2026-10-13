import { normalizeForCues } from '../utilities/save-cue-matcher.utility';
import { mightBeSaveRequest } from '../utilities/save-intent.utility';

describe('mightBeSaveRequest — spelling variants (ADR-168)', () => {
  it.each([
    ['uppercase', "DON'T FORGET that I prefer metric units"],
    ['curly apostrophe (en)', 'Don’t forget I work nights'],
    ['curly apostrophe (fr)', 'N’oublie pas que je suis végétarien'],
    ['Arabic with diacritics', 'لا تنسَ أنني أفضّل النظام المتري'],
    ['Arabic with hamza on alef', 'أضف هذا إلى مجموعتي'],
    ['Persian with ZWNJ', 'این را توی یادداشت‌هام بذار'],
    ['Arabic yeh in a Persian cue', 'ایموجي نفرست'],
    ['extra spacing around a cue', '   Remember   that   I am vegetarian   '],
  ])('catches %s', (_label, text) => {
    expect(mightBeSaveRequest(text)).toBe(true);
  });

  it('folds the same variants on both sides', () => {
    expect(normalizeForCues('Don’t')).toBe("don't");
    expect(normalizeForCues('تنسَ')).toBe(normalizeForCues('تنس'));
    expect(normalizeForCues('أ')).toBe(normalizeForCues('ا'));
  });
});

describe('mightBeSaveRequest — ordinary turns stay free (ADR-168)', () => {
  it.each([
    'What is the capital of Australia?',
    'Write a Python function that reverses a string.',
    'Give me a quick dinner recipe.',
    'Translate "good morning" into Spanish.',
    'Was ist die Hauptstadt von Australien?',
    "Quelle est la capitale de l'Australie ?",
    'オーストラリアの首都はどこですか？',
    '澳大利亚的首都是哪里？',
    'Какая столица Австралии?',
    'ما عاصمة أستراليا؟',
    '',
    '   ',
  ])('does not ask the planner about %j', (text) => {
    expect(mightBeSaveRequest(text)).toBe(false);
  });

  it('a short bare imperative needs an assistant message above it', () => {
    expect(mightBeSaveRequest('Keep it')).toBe(false);
    expect(mightBeSaveRequest('Keep it', true)).toBe(true);
    expect(mightBeSaveRequest('Guárdalo', true)).toBe(true);
    expect(mightBeSaveRequest('保存', true)).toBe(true);
  });

  it('a long message is not an anaphoric command, even after an assistant message', () => {
    const long = 'Keep going with the explanation of how photosynthesis works in detail please';
    expect(mightBeSaveRequest(long, true)).toBe(false);
  });
});

describe('mightBeSaveRequest — stress', () => {
  it('never throws on regular-expression metacharacters or lone surrogates', () => {
    const hostile = ['(((', '[a-z', '\\', '.*+?^${}()|[]\\', 'a|b|', '\ud83d', '\u0000\u0001'];
    for (const text of hostile) {
      expect(() => mightBeSaveRequest(text)).not.toThrow();
      expect(() => mightBeSaveRequest(text, true)).not.toThrow();
    }
  });

  it('scans a 100,000-character message in linear time', () => {
    const filler = 'lorem ipsum dolor sit amet '.repeat(3_700).slice(0, 100_000);
    const started = performance.now();
    const plain = mightBeSaveRequest(filler);
    const withCue = mightBeSaveRequest(`${filler} and from now on answer in French`);
    const elapsed = performance.now() - started;
    expect(plain).toBe(false);
    expect(withCue).toBe(true);
    expect(elapsed).toBeLessThan(1_000);
  });

  it('a pathological repeated-prefix message does not blow up', () => {
    const text = 'rem'.repeat(30_000);
    const started = performance.now();
    expect(mightBeSaveRequest(text)).toBe(false);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
