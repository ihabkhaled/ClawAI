import { generateAudioSchema } from '../../dto/generate-audio.dto';
import { AUDIO_PRICE_TABLE } from '../../constants/audio-payg.constants';
import { audioMeterMode } from '../audio-settlement.utility';
import { pcm16ToWav, pcmDurationSeconds, pcmSampleRate } from '../audio-wav.utility';
import { audioPriceKey } from '../audio-wire.utility';

describe('audio wav utility', () => {
  it('builds a canonical 44-byte header and drops a trailing partial frame', () => {
    const wav = pcm16ToWav(Buffer.alloc(11), 24_000, 1);

    expect(wav.length).toBe(44 + 10);
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt32LE(24)).toBe(24_000);
    expect(wav.readUInt32LE(40)).toBe(10);
  });

  it('reads the rate from the mime type, else 24 kHz, and never reports 0 seconds', () => {
    expect(pcmSampleRate('audio/L16;codec=pcm;rate=16000')).toBe(16_000);
    expect(pcmSampleRate('audio/L16')).toBe(24_000);
    expect(pcmDurationSeconds(10, 24_000, 1)).toBe(1);
    expect(pcmDurationSeconds(96_000, 24_000, 1)).toBe(2);
  });
});

describe('audio metering mode', () => {
  it('meters OpenAI per character, Gemini speech per token, music per song', () => {
    expect(audioMeterMode('SPEECH', 'AUDIO_OPENAI', 'tts-1')).toBe('CHARACTERS');
    expect(audioMeterMode('SPEECH', 'AUDIO_OPENAI', 'gpt-4o-mini-tts')).toBe('TOKENS');
    expect(audioMeterMode('SPEECH', 'AUDIO_GEMINI', 'models/gemini-2.5-pro-preview-tts')).toBe(
      'TOKENS',
    );
    expect(audioMeterMode('MUSIC', 'AUDIO_GEMINI', 'lyria-3.5')).toBe('SONG');
    expect(audioPriceKey(' models/lyria-3.5 ')).toBe('lyria-3.5');
  });
});

describe('audio price table', () => {
  it('uses integer micro-USD only and has no duplicate model', () => {
    const models = AUDIO_PRICE_TABLE.map((entry) => entry.model);
    expect(new Set(models).size).toBe(models.length);
    for (const entry of AUDIO_PRICE_TABLE) {
      expect(Number.isInteger(entry.inputMicroUsd)).toBe(true);
      expect(Number.isInteger(entry.outputMicroUsd)).toBe(true);
    }
  });
});

describe('generateAudioSchema', () => {
  const base = { userId: 'u', kind: 'SPEECH', provider: 'AUDIO_OPENAI', prompt: 'Hello' };

  it('accepts the contract body with optional fields omitted', () => {
    expect(generateAudioSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an unknown provider, a bad kind and an empty prompt', () => {
    expect(generateAudioSchema.safeParse({ ...base, provider: 'AUDIO_XAI' }).success).toBe(false);
    expect(generateAudioSchema.safeParse({ ...base, kind: 'VIDEO' }).success).toBe(false);
    expect(generateAudioSchema.safeParse({ ...base, prompt: '  ' }).success).toBe(false);
  });

  it('keeps music on Gemini and Lyria models, and speech off them', () => {
    expect(generateAudioSchema.safeParse({ ...base, kind: 'MUSIC' }).success).toBe(false);
    expect(
      generateAudioSchema.safeParse({
        ...base,
        kind: 'MUSIC',
        provider: 'AUDIO_GEMINI',
        model: 'lyria-3.5',
      }).success,
    ).toBe(true);
    expect(
      generateAudioSchema.safeParse({
        ...base,
        kind: 'MUSIC',
        provider: 'AUDIO_GEMINI',
        model: 'gemini-x-tts',
      }).success,
    ).toBe(false);
    expect(generateAudioSchema.safeParse({ ...base, model: 'lyria-3.5' }).success).toBe(false);
  });
});
