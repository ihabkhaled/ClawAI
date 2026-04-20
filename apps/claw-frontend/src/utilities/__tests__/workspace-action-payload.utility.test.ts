import { describe, expect, it } from 'vitest';

import { formatPayloadPreview } from '../workspace-action-payload.utility';

describe('formatPayloadPreview', () => {
  it('returns null for empty payloads', () => {
    expect(formatPayloadPreview({})).toBeNull();
  });

  it('pretty-prints simple payloads', () => {
    const out = formatPayloadPreview({ channel: 'general', text: 'hi' });
    expect(out).toContain('"channel": "general"');
    expect(out).toContain('"text": "hi"');
  });

  it('redacts sensitive keys by name pattern', () => {
    const out = formatPayloadPreview({
      accessToken: 'secret-token',
      apiKey: 'secret-key',
      api_key: 'secret-snake',
      bearerToken: 'secret-bearer',
      password: 'hunter2',
      title: 'ok',
    });
    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('secret-token');
    expect(out).not.toContain('secret-key');
    expect(out).not.toContain('secret-snake');
    expect(out).not.toContain('secret-bearer');
    expect(out).not.toContain('hunter2');
    expect(out).toContain('"title": "ok"');
  });

  it('redacts sensitive keys inside nested objects and arrays', () => {
    const out = formatPayloadPreview({
      headers: { Authorization: 'Bearer abc', 'x-api-key': 'xyz' },
      items: [{ token: 'nope', safe: 1 }],
    });
    expect(out).not.toContain('abc');
    expect(out).not.toContain('xyz');
    expect(out).not.toContain('"token": "nope"');
    expect(out).toContain('"safe": 1');
  });

  it('truncates very long payloads with a marker', () => {
    const big = { blob: 'x'.repeat(5000) };
    const out = formatPayloadPreview(big);
    expect(out).toContain('truncated');
    expect(out?.length ?? 0).toBeLessThan(5000);
  });
});
