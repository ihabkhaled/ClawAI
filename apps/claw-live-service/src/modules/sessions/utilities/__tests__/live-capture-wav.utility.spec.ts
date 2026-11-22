import { pcmToWav } from '../../../processing/utilities/wav.utility';
import { parseCaptureWav, parseChunkStartAt } from '../live-capture-wav.utility';

const seconds = (value: number): Buffer => Buffer.alloc(Math.round(value * 32_000));

describe('parseCaptureWav', () => {
  it.each([
    [1, 1000],
    [6, 6000],
    [8, 8000],
  ])('accepts %s s of 16 kHz mono PCM16', (length, durationMs) => {
    expect(parseCaptureWav(pcmToWav(seconds(length), 16_000, 1))).toEqual({ durationMs });
  });

  it('walks past extra chunks (LIST) before data', () => {
    const wav = pcmToWav(seconds(2), 16_000, 1);
    const list = Buffer.concat([
      Buffer.from('LIST'),
      Buffer.from([4, 0, 0, 0]),
      Buffer.from('INFO'),
    ]);
    const withList = Buffer.concat([wav.subarray(0, 36), list, wav.subarray(36)]);
    expect(parseCaptureWav(withList)).toEqual({ durationMs: 2000 });
  });

  it.each([
    ['too short', pcmToWav(seconds(0.5), 16_000, 1)],
    ['too long', pcmToWav(seconds(8.5), 16_000, 1)],
    ['stereo', pcmToWav(seconds(2), 16_000, 2)],
    ['48 kHz', pcmToWav(seconds(2), 48_000, 1)],
    ['not RIFF', Buffer.concat([Buffer.from('JUNK'), pcmToWav(seconds(2), 16_000, 1).subarray(4)])],
    ['tiny', Buffer.from('RIFF')],
    ['empty', Buffer.alloc(0)],
  ])('rejects %s', (_label, buffer) => {
    expect(parseCaptureWav(buffer)).toBeNull();
  });

  it('rejects a data chunk that claims more bytes than the body holds', () => {
    const wav = pcmToWav(seconds(2), 16_000, 1);
    wav.writeUInt32LE(wav.length * 2, 40);
    expect(parseCaptureWav(wav)).toBeNull();
  });

  it('rejects 8-bit and non-PCM formats', () => {
    const eightBit = pcmToWav(seconds(2), 16_000, 1);
    eightBit.writeUInt16LE(8, 34);
    expect(parseCaptureWav(eightBit)).toBeNull();
    const float = pcmToWav(seconds(2), 16_000, 1);
    float.writeUInt16LE(3, 20);
    expect(parseCaptureWav(float)).toBeNull();
  });
});

describe('parseChunkStartAt', () => {
  const now = 1_800_000_000_000;

  it('accepts an epoch ms within 2 min of server time', () => {
    expect(parseChunkStartAt(String(now - 119_000), now)).toBe(now - 119_000);
    expect(parseChunkStartAt(` ${String(now + 60_000)} `, now)).toBe(now + 60_000);
  });

  it.each([undefined, '', 'abc', '-5', '1.5', String(now - 121_000), String(now + 121_000)])(
    'rejects %s',
    (value) => {
      expect(parseChunkStartAt(value, now)).toBeNull();
    },
  );
});
