import {
  parseGatewayHeaders,
  serializeGatewayHeaders,
  withGatewayHeaders,
} from '../gateway-headers.utility';

describe('serializeGatewayHeaders', () => {
  it('keeps what is stored when the field is omitted', () => {
    expect(serializeGatewayHeaders(undefined)).toBeUndefined();
  });

  it('clears the column for an empty object', () => {
    expect(serializeGatewayHeaders({})).toBeNull();
  });

  it('sorts names so the same headers always give the same plaintext', () => {
    expect(serializeGatewayHeaders({ b: '2', a: '1' })).toBe('{"a":"1","b":"2"}');
  });
});

describe('parseGatewayHeaders', () => {
  it('round-trips a serialised object', () => {
    const plaintext = serializeGatewayHeaders({ 'Helicone-Auth': 'Bearer h' }) ?? '';
    expect(parseGatewayHeaders(plaintext)).toEqual({ 'Helicone-Auth': 'Bearer h' });
  });

  it.each([null, undefined, '', 'not json', '[]', '"x"', 'null'])(
    'yields no headers for an unreadable row (%s)',
    (plaintext) => {
      expect(parseGatewayHeaders(plaintext)).toEqual({});
    },
  );

  it('drops non-string values', () => {
    expect(parseGatewayHeaders('{"a":"1","b":2}')).toEqual({ a: '1' });
  });
});

describe('withGatewayHeaders', () => {
  it('returns the provider headers untouched when there are no gateway headers', () => {
    const provider = { Authorization: 'Bearer k' };
    expect(withGatewayHeaders(provider, undefined)).toBe(provider);
  });

  it('adds gateway headers alongside the provider headers', () => {
    expect(
      withGatewayHeaders({ Authorization: 'Bearer k' }, { 'x-portkey-api-key': 'pk' }),
    ).toEqual({ Authorization: 'Bearer k', 'x-portkey-api-key': 'pk' });
  });

  it('never lets a gateway header override a provider header, in any case', () => {
    expect(withGatewayHeaders({ 'x-api-key': 'real' }, { 'X-API-KEY': 'spoof' })).toEqual({
      'x-api-key': 'real',
    });
  });

  it('drops a forbidden name even when the provider did not set it', () => {
    expect(withGatewayHeaders({}, { Host: 'internal', Cookie: 'c', ok: '1' })).toEqual({
      ok: '1',
    });
  });
});
