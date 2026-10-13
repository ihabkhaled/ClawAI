import {
  anchoredCueRegExp,
  cuePattern,
  cueRegExp,
  hasEnoughWeakCues,
  normalizeForCues,
  weakCueRegExp,
  wholeMessageRegExp,
} from '../save-cue-matcher.utility';
import { mightBeSaveRequest } from '../save-intent.utility';

describe('normalizeForCues', () => {
  it('turns a Persian ZWNJ into a space and keeps both spellings matchable', () => {
    expect(normalizeForCues('نگه‌دار')).toBe('نگه دار');
    expect(normalizeForCues('نگه   دار')).toBe('نگه دار');
    expect(normalizeForCues('نگهدار')).toBe('نگهدار');
  });

  it('still folds diacritics, alef forms and curly apostrophes', () => {
    expect(normalizeForCues('Don’t')).toBe("don't");
    expect(normalizeForCues('تنسَ')).toBe(normalizeForCues('تنس'));
    expect(normalizeForCues('أ')).toBe(normalizeForCues('ا'));
  });
});

describe('cue boundaries', () => {
  it('matches a cue at a word start only, not inside another word', () => {
    const regexp = cueRegExp(['segna che$', 'notier']);
    expect(regexp.test('segna che il budget')).toBe(true);
    expect(regexp.test('assegna che valore')).toBe(false);
    expect(regexp.test('bitte notier das')).toBe(true);
    expect(regexp.test('denotier')).toBe(false);
  });

  it('a trailing $ also needs the word to end', () => {
    const regexp = cueRegExp(['segna$', 'सेव$']);
    expect(regexp.test('segna questo')).toBe(true);
    expect(regexp.test('un segnale')).toBe(false);
    expect(regexp.test('इसे सेव करो')).toBe(true);
    expect(regexp.test('क्लाउड सेवा')).toBe(false);
  });

  it('lets Arabic and Persian glue a one-letter prefix before the cue', () => {
    const regexp = cueRegExp(['احفظ']);
    expect(regexp.test('واحفظ هذا')).toBe(true);
    expect(regexp.test('xاحفظ')).toBe(false);
  });

  it('matches Chinese, Japanese and Thai cues as plain text', () => {
    expect(cuePattern('留着')).toBe('留着');
    expect(cueRegExp(['留着']).test('这个留着下次用')).toBe(true);
  });

  it('escapes regular-expression characters in a cue', () => {
    expect(cueRegExp(['a.b']).test('axb')).toBe(false);
    expect(cueRegExp(['a.b']).test('a.b')).toBe(true);
  });
});

describe('anchored cues', () => {
  const regexp = anchoredCueRegExp(['以后']);

  it('count at the start of the message or after punctuation', () => {
    expect(regexp.test('以后叫我小明')).toBe(true);
    expect(regexp.test('好的，以后叫我小明')).toBe(true);
    expect(regexp.test('  以后叫我小明')).toBe(true);
  });

  it('do not count inside a sentence', () => {
    expect(regexp.test('运行以后会报错')).toBe(false);
  });
});

describe('weak cues', () => {
  const weak = weakCueRegExp(['пакет', 'добавь', 'оставь']);

  it('need two different generic words', () => {
    expect(hasEnoughWeakCues(weak, 'установить пакет')).toBe(false);
    expect(hasEnoughWeakCues(weak, 'пакет пакет пакет')).toBe(false);
    expect(hasEnoughWeakCues(weak, 'добавь это в пакет')).toBe(true);
  });
});

describe('whole-message commands', () => {
  const save = wholeMessageRegExp(['save'], ['it', 'that', 'this'], true);
  const anaphoric = wholeMessageRegExp(['keep', 'guárdalo'], ['it'], false);

  it('save needs its object and nothing else in the message', () => {
    expect(save.test('save that.')).toBe(true);
    expect(save.test('please save this!')).toBe(true);
    expect(save.test('save')).toBe(false);
    expect(save.test('save this file as a pdf')).toBe(false);
  });

  it('an anaphoric verb may stand alone or take one object', () => {
    expect(anaphoric.test('keep it')).toBe(true);
    expect(anaphoric.test('guárdalo')).toBe(true);
    expect(anaphoric.test('keep going')).toBe(false);
  });
});

describe('mightBeSaveRequest — false positives that burned a planner call', () => {
  it.each([
    'Never use var in TypeScript.',
    'Call me back tomorrow at noon.',
    'Keep going with the explanation.',
    'Save this file as a PDF please',
    'Store that value in a variable',
    'Assegna un valore alla variabile.',
    'Come installo un pacchetto con apt?',
    'Установить пакет',
    'Добавь функцию',
    'Оставь только первые три строки',
    '运行以后会报错吗？',
    '把代码放到函数里。',
    'ข้อมูลต่อไปนี้ถูกต้องไหม',
    'เก็บข้อมูลลูกค้า',
    'ノートパソコンの選び方',
    'Cómo apuntar el cursor',
    'クラウド सेवा क्या है',
  ])('does not ask the planner about %j', (text) => {
    expect(mightBeSaveRequest(text)).toBe(false);
  });

  it.each([
    'Save that.',
    'save it',
    'Segna che il budget è 5k',
    'Apunta que prefiero el sistema métrico',
    'इसे सेव कर लो',
    '以后叫我小明',
    'Добавь это в мой пакет',
    'این را نگه‌دار',
    'این را نگهدار',
    'این را نگه دار',
    'ต่อไปนี้อย่าใช้อีโมจิกับฉัน',
  ])('still asks the planner about %j', (text) => {
    expect(mightBeSaveRequest(text)).toBe(true);
  });
});
