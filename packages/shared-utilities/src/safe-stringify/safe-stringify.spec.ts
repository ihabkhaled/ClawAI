import { safeStringify } from './safe-stringify.utility';

describe('safeStringify', () => {
  it('serializes a plain object unchanged when no sensitive keys are present', () => {
    const result = safeStringify({ id: 1, name: 'claw', nested: { ok: true } });
    expect(JSON.parse(result)).toEqual({ id: 1, name: 'claw', nested: { ok: true } });
  });

  it('redacts known sensitive top-level keys', () => {
    const result = JSON.parse(
      safeStringify({
        password: 'hunter2',
        token: 'abc',
        apiKey: 'k',
        refreshToken: 'r',
        accessToken: 'a',
        secret: 's',
        authorization: 'Bearer x',
        cookie: 'sid=1',
        clientSecret: 'cs',
        keep: 'visible',
      }),
    );
    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.refreshToken).toBe('[REDACTED]');
    expect(result.accessToken).toBe('[REDACTED]');
    expect(result.secret).toBe('[REDACTED]');
    expect(result.authorization).toBe('[REDACTED]');
    expect(result.cookie).toBe('[REDACTED]');
    expect(result.clientSecret).toBe('[REDACTED]');
    expect(result.keep).toBe('visible');
  });

  it('redacts sensitive keys case-insensitively', () => {
    const result = JSON.parse(safeStringify({ Password: 'p', APIKEY: 'k', Authorization: 'a' }));
    expect(result.Password).toBe('[REDACTED]');
    expect(result.APIKEY).toBe('[REDACTED]');
    expect(result.Authorization).toBe('[REDACTED]');
  });

  it('redacts sensitive keys nested inside objects and arrays', () => {
    const result = JSON.parse(
      safeStringify({
        outer: { token: 'secret-token', safe: 'ok' },
        list: [{ password: 'p1' }, { password: 'p2' }],
      }),
    );
    expect(result.outer.token).toBe('[REDACTED]');
    expect(result.outer.safe).toBe('ok');
    expect(result.list[0].password).toBe('[REDACTED]');
    expect(result.list[1].password).toBe('[REDACTED]');
  });

  it('passes through primitives and null/undefined', () => {
    expect(safeStringify('hello')).toBe('"hello"');
    expect(safeStringify(42)).toBe('42');
    expect(safeStringify(null)).toBe('null');
    expect(safeStringify(true)).toBe('true');
  });

  it('returns the unstringifiable placeholder for circular structures', () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(safeStringify(circular)).toBe('[unstringifiable]');
  });
});
