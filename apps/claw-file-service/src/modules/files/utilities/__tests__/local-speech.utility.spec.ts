import { describe, expect, it } from 'vitest';
import { localSpeechApiBase, localSpeechHealthUrl } from '../local-speech.utility';

describe('localSpeechApiBase', () => {
  it('appends /v1 to a server root', () => {
    expect(localSpeechApiBase('http://speech:8000')).toBe('http://speech:8000/v1');
  });

  it('trims whitespace and trailing slashes', () => {
    expect(localSpeechApiBase('  http://speech:8000//  ')).toBe('http://speech:8000/v1');
  });

  it('never doubles an existing /v1', () => {
    expect(localSpeechApiBase('http://proxy/v1')).toBe('http://proxy/v1');
  });

  it('returns null for a blank value (the candidate is off)', () => {
    expect(localSpeechApiBase('')).toBeNull();
    expect(localSpeechApiBase('   ')).toBeNull();
  });
});

describe('localSpeechHealthUrl', () => {
  it('puts the health path at the server root, not under /v1', () => {
    expect(localSpeechHealthUrl('http://speech:8000/v1', '/health')).toBe(
      'http://speech:8000/health',
    );
  });

  it('keeps a base that has no /v1', () => {
    expect(localSpeechHealthUrl('http://speech:8000', '/health')).toBe('http://speech:8000/health');
  });
});
