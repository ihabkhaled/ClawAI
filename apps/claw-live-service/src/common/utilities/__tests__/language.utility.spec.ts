import {
  baseLanguage,
  cardLanguage,
  resolveSpokenLanguage,
  scriptLanguage,
} from '../language.utility';

describe('scriptLanguage', () => {
  it.each([
    ['مرحبا بكم في البث المباشر', 'ar'],
    ['این یک پخش زنده است و گفتگو', 'fa'],
    ['یہ ایک براہ راست نشریہ ہے', 'ur'],
    ['Привет, это прямой эфир', 'ru'],
    ['Привіт, це пряма трансляція', 'uk'],
    ['नमस्ते यह लाइव है', 'hi'],
    ['こんにちは、ライブです', 'ja'],
    ['大家好欢迎收看直播', 'zh'],
    ['안녕하세요 라이브입니다', 'ko'],
    ['שלום לכולם', 'he'],
    ['Γεια σας', 'el'],
    ['สวัสดีครับ', 'th'],
  ])('reads %s as %s', (text, language) => {
    expect(scriptLanguage(text)).toBe(language);
  });

  it('names no language for Latin script, digits or an empty line', () => {
    expect(scriptLanguage('Hello and welcome')).toBeNull();
    expect(scriptLanguage('Hola a todos')).toBeNull();
    expect(scriptLanguage('123 456')).toBeNull();
    expect(scriptLanguage('')).toBeNull();
  });
});

describe('resolveSpokenLanguage', () => {
  it('trusts the speech model first, as a base code', () => {
    expect(resolveSpokenLanguage('pt-BR', 'Olá', null)).toBe('pt');
    expect(resolveSpokenLanguage('Arabic', 'hello', null)).toBe('ar');
  });

  it('falls back to the script when the model said nothing', () => {
    expect(resolveSpokenLanguage(null, 'أهلا وسهلا', 'en')).toBe('ar');
  });

  it('lets a Latin line inherit a Latin language but never a script language', () => {
    expect(resolveSpokenLanguage(null, 'Hola amigos', 'es')).toBe('es');
    expect(resolveSpokenLanguage(null, 'OK thanks', 'ar')).toBeNull();
    expect(resolveSpokenLanguage(null, 'Hello', null)).toBeNull();
  });

  it('keeps baseLanguage behaviour', () => {
    expect(baseLanguage('EN')).toBe('en');
    expect(baseLanguage(null)).toBeNull();
  });
});

describe('cardLanguage', () => {
  it('reads the script of the card, not the requested language', () => {
    expect(cardLanguage('عاجل', 'خبر جديد', 'en')).toBe('ar');
    expect(cardLanguage('Breaking', 'New report', 'es')).toBe('es');
    expect(cardLanguage('Breaking', 'New report', 'ar')).toBeNull();
    expect(cardLanguage('Breaking', 'New report', null)).toBeNull();
  });
});
