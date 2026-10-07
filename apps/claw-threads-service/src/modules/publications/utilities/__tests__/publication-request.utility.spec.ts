import type { Request } from 'express';

import { clientAddress, userAgentOf } from '../publication-request.utility';

const request = (headers: Record<string, unknown>): Request => ({ headers }) as unknown as Request;

describe('publication request utilities', () => {
  it('reads the user agent only when it is a string', () => {
    expect(userAgentOf(request({ 'user-agent': 'x' }))).toBe('x');
    expect(userAgentOf(request({}))).toBeUndefined();
  });

  it('prefers the forwarded address, then the socket', () => {
    expect(clientAddress(request({ 'x-real-ip': ' 1.2.3.4 ' }), '9.9.9.9')).toBe('1.2.3.4');
    expect(clientAddress(request({ 'x-real-ip': ' ' }), '9.9.9.9')).toBe('9.9.9.9');
    expect(clientAddress(request({}), '9.9.9.9')).toBe('9.9.9.9');
  });
});
