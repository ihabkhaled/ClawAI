import { BadRequestException } from '@nestjs/common';

import { RawWebhookBodyPipe } from '../raw-webhook-body.pipe';

describe('RawWebhookBodyPipe', () => {
  const pipe = new RawWebhookBodyPipe();

  it('returns the input untouched when it is already a Buffer', () => {
    const buf = Buffer.from('hello', 'utf8');
    const out = pipe.transform(buf);
    expect(out).toBe(buf);
  });

  it('coerces strings via utf8 to Buffer', () => {
    const out = pipe.transform('{"x":1}');
    expect(Buffer.isBuffer(out)).toBe(true);
    expect(out.toString('utf8')).toBe('{"x":1}');
  });

  it('rejects plain objects (would otherwise be JSON.stringify-coerced)', () => {
    expect(() => pipe.transform({ malicious: true })).toThrow(BadRequestException);
  });

  it('rejects arrays', () => {
    expect(() => pipe.transform([1, 2, 3])).toThrow(BadRequestException);
  });

  it('rejects numbers, booleans, null, undefined', () => {
    expect(() => pipe.transform(42)).toThrow(BadRequestException);
    expect(() => pipe.transform(true)).toThrow(BadRequestException);
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });
});
