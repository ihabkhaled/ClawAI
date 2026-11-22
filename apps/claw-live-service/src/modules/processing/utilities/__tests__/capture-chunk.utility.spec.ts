import { captureQueueKey, decodeCaptureChunk, encodeCaptureChunk } from '../capture-chunk.utility';

describe('capture chunk entries', () => {
  it('round-trips media times and WAV bytes', () => {
    const chunk = {
      wav: Buffer.from('RIFF....WAVE'),
      startAt: 1_800_000_000_123,
      endAt: 1_800_000_006_123,
    };
    const entry = encodeCaptureChunk(chunk);
    expect(entry.length).toBe(16 + chunk.wav.length);
    expect(decodeCaptureChunk(entry)).toEqual(chunk);
  });

  it('rejects an entry without audio or with end before start', () => {
    expect(decodeCaptureChunk(Buffer.alloc(16))).toBeNull();
    const backwards = encodeCaptureChunk({ wav: Buffer.from('x'), startAt: 10, endAt: 5 });
    expect(decodeCaptureChunk(backwards)).toBeNull();
  });

  it('names the run queue', () => {
    expect(captureQueueKey('run-1')).toBe('live:capture:run-1');
  });
});
