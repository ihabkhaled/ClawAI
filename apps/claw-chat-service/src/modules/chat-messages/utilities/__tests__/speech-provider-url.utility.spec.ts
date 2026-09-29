import { SpeechProvider } from '../../../../common/enums';
import {
  geminiSpeechUrl,
  openAiSpeechUrl,
  speechProviderBaseUrl,
} from '../speech-provider-url.utility';

describe('speechProviderBaseUrl', () => {
  it('falls back to the default host when the connector sets none', () => {
    expect(speechProviderBaseUrl(SpeechProvider.OPENAI, null)).toBe('https://api.openai.com/v1');
    expect(speechProviderBaseUrl(SpeechProvider.OPENAI, '   ')).toBe('https://api.openai.com/v1');
    expect(speechProviderBaseUrl(SpeechProvider.GEMINI, undefined)).toBe(
      'https://generativelanguage.googleapis.com/v1beta',
    );
  });

  it('uses the connector base URL, trailing slashes trimmed', () => {
    expect(speechProviderBaseUrl(SpeechProvider.OPENAI, 'https://gw.example.com/v1//')).toBe(
      'https://gw.example.com/v1',
    );
  });

  it('drops the Gemini OpenAI-compat /openai suffix, and only for Gemini', () => {
    expect(
      speechProviderBaseUrl(
        SpeechProvider.GEMINI,
        'https://generativelanguage.googleapis.com/v1beta/openai/',
      ),
    ).toBe('https://generativelanguage.googleapis.com/v1beta');
    expect(speechProviderBaseUrl(SpeechProvider.OPENAI, 'https://gw.example.com/openai')).toBe(
      'https://gw.example.com/openai',
    );
  });
});

describe('speech URLs', () => {
  it('builds the OpenAI and Gemini endpoints under a base', () => {
    expect(openAiSpeechUrl('https://b/v1')).toBe('https://b/v1/audio/speech');
    expect(geminiSpeechUrl('https://b/v1beta', 'gemini tts')).toBe(
      'https://b/v1beta/models/gemini%20tts:generateContent',
    );
  });
});
