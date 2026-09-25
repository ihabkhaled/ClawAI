import {
  GEMINI_TTS_DEFAULT_SAMPLE_RATE,
  PCM_BITS_PER_SAMPLE,
  PCM_BYTES_PER_SAMPLE,
  PCM_SAMPLE_RATE_PATTERN,
  WAV_FMT_CHUNK_BYTES,
  WAV_FORMAT_PCM,
  WAV_HEADER_BYTES,
} from '../constants/speech.constants';

/**
 * Wraps raw 16-bit little-endian PCM (what Gemini TTS returns as
 * `audio/L16;codec=pcm;rate=24000`) in a canonical 44-byte RIFF/WAVE header,
 * so a browser `<audio>` element and file-service's magic-byte check both
 * accept it. A trailing partial sample frame is dropped rather than letting
 * the header lie about the data length.
 */
export function pcm16ToWav(pcm: Buffer, sampleRate: number, channels: number): Buffer {
  const blockAlign = channels * PCM_BYTES_PER_SAMPLE;
  const dataLength = pcm.length - (pcm.length % blockAlign);
  const header = Buffer.alloc(WAV_HEADER_BYTES);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(WAV_HEADER_BYTES - 8 + dataLength, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(WAV_FMT_CHUNK_BYTES, 16);
  header.writeUInt16LE(WAV_FORMAT_PCM, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(PCM_BITS_PER_SAMPLE, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataLength, 40);
  return Buffer.concat([header, pcm.subarray(0, dataLength)]);
}

/** The sample rate a PCM mime type declares (`...;rate=24000`), else Gemini's default. */
export function pcmSampleRate(mimeType: string): number {
  const match = PCM_SAMPLE_RATE_PATTERN.exec(mimeType);
  const rate = match === null ? Number.NaN : Number.parseInt(match[1] ?? '', 10);
  return Number.isInteger(rate) && rate > 0 ? rate : GEMINI_TTS_DEFAULT_SAMPLE_RATE;
}
