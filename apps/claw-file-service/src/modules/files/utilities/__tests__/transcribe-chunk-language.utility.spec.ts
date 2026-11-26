import { isNonSpeechChunk, splitChunkLanguageTag } from '../transcribe-chunk-language.utility';

describe('splitChunkLanguageTag', () => {
  it('reads the leading tag as a lower-case code and removes it', () => {
    expect(splitChunkLanguageTag('[[lang:EN]] Hello there')).toEqual({
      text: 'Hello there',
      language: 'en',
    });
  });

  it('accepts a region subtag and spaces inside the tag', () => {
    expect(splitChunkLanguageTag('[[ lang : pt-BR ]]\nOlá')).toEqual({
      text: 'Olá',
      language: 'pt-br',
    });
  });

  it('keeps the first tag and strips every tag, wherever it sits', () => {
    expect(splitChunkLanguageTag('Hola [[lang:es]] amigos [[lang:en]]')).toEqual({
      text: 'Hola amigos',
      language: 'es',
    });
  });

  it('returns no language when there is no tag, and keeps a spelled-out name', () => {
    expect(splitChunkLanguageTag(' plain words ')).toEqual({ text: 'plain words', language: null });
    expect(splitChunkLanguageTag('[[lang:English]] x')).toEqual({ text: 'x', language: 'english' });
  });
});

describe('isNonSpeechChunk', () => {
  it.each([
    '',
    '00:00 00:01 00:02 00:03',
    '0: 00:00, 00:01',
    '[Music]',
    '(applause) [music]',
    '1 2 3',
    '♪ ♪',
  ])('treats %j as no speech', (text) => {
    expect(isNonSpeechChunk(text)).toBe(true);
  });

  it.each([
    'Hello there',
    'Meet me at 10:30 tonight',
    'अरे यार',
    '[Music] and then he said hi',
    'Room 101',
    '♪ انا بموت',
  ])('keeps %j', (text) => {
    expect(isNonSpeechChunk(text)).toBe(false);
  });
});
