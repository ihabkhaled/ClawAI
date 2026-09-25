import { describe, expect, it } from 'vitest';

import { pcm16ToWav, pcmSampleRate } from '../wav-audio.utility';

// Multimodal batch 9 — Gemini TTS returns raw 16-bit PCM; a browser and
// file-service's magic-byte check both need a real RIFF/WAVE header.
describe('pcm16ToWav', () => {
  it('writes the exact canonical 44-byte header for 24 kHz mono', () => {
    const pcm = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const wav = pcm16ToWav(pcm, 24_000, 1);

    // prettier-ignore
    const expectedHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x28, 0x00, 0x00, 0x00, // 36 + 4 data bytes = 40
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6d, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // fmt chunk size 16
      0x01, 0x00,             // PCM
      0x01, 0x00,             // 1 channel
      0xc0, 0x5d, 0x00, 0x00, // 24000 Hz
      0x80, 0xbb, 0x00, 0x00, // byte rate 48000
      0x02, 0x00,             // block align 2
      0x10, 0x00,             // 16 bits per sample
      0x64, 0x61, 0x74, 0x61, // "data"
      0x04, 0x00, 0x00, 0x00, // 4 data bytes
    ]);
    expect(wav.subarray(0, 44)).toEqual(expectedHeader);
    expect(wav.subarray(44)).toEqual(pcm);
    expect(wav.length).toBe(48);
  });

  it('computes byte rate and block align for stereo 44.1 kHz', () => {
    const wav = pcm16ToWav(Buffer.alloc(8), 44_100, 2);
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(24)).toBe(44_100);
    expect(wav.readUInt32LE(28)).toBe(176_400);
    expect(wav.readUInt16LE(32)).toBe(4);
    expect(wav.readUInt32LE(40)).toBe(8);
  });

  it('drops a trailing partial sample so the header never lies', () => {
    const wav = pcm16ToWav(Buffer.from([1, 2, 3]), 24_000, 1);
    expect(wav.readUInt32LE(40)).toBe(2);
    expect(wav.readUInt32LE(4)).toBe(38);
    expect(wav.length).toBe(46);
  });

  it('produces a valid empty WAV from empty PCM', () => {
    const wav = pcm16ToWav(Buffer.alloc(0), 24_000, 1);
    expect(wav.length).toBe(44);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
  });
});

describe('pcmSampleRate', () => {
  it.each([
    ['audio/L16;codec=pcm;rate=24000', 24_000],
    ['audio/L16;rate=16000', 16_000],
    ['audio/l16; RATE=48000', 48_000],
    ['audio/L16', 24_000],
    ['', 24_000],
    ['audio/L16;rate=abc', 24_000],
  ])('%s → %d', (mime, rate) => {
    expect(pcmSampleRate(mime)).toBe(rate);
  });
});
