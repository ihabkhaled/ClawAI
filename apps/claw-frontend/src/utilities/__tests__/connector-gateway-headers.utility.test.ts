import { describe, expect, it } from 'vitest';

import type { GatewayHeaderRow } from '@/types';
import {
  createGatewayHeaderRow,
  gatewayHeaderRowsToRecord,
} from '@/utilities/connector-gateway-headers.utility';

const row = (name: string, value: string, id = name): GatewayHeaderRow => ({ id, name, value });

describe('gatewayHeaderRowsToRecord', () => {
  it('converts filled rows and trims the name', () => {
    expect(gatewayHeaderRowsToRecord([row(' x-portkey-config ', 'cfg')])).toEqual({
      ok: true,
      headers: { 'x-portkey-config': 'cfg' },
    });
  });

  it('ignores fully blank rows', () => {
    expect(gatewayHeaderRowsToRecord([row('', '', 'a'), row('', '', 'b')])).toEqual({
      ok: true,
      headers: {},
    });
  });

  it.each([
    ['a reserved credential header', [row('Authorization', 'Bearer x')]],
    ['a reserved key header in any case', [row('X-Api-Key', 'k')]],
    ['an invalid token name', [row('bad name', 'v')]],
    ['a missing value', [row('x-trace', '')]],
    ['a header injection value', [row('x-trace', 'a\r\nHost: evil')]],
    ['a duplicate name', [row('x-a', '1', '1'), row('X-A', '2', '2')]],
    ['an over-long value', [row('x-a', 'v'.repeat(1001))]],
    ['more than ten headers', Array.from({ length: 11 }, (_, i) => row(`x-h${String(i)}`, 'v'))],
  ])('refuses %s', (_label, rows) => {
    expect(gatewayHeaderRowsToRecord(rows)).toEqual({ ok: false });
  });

  it('creates empty rows with distinct ids', () => {
    const a = createGatewayHeaderRow();
    const b = createGatewayHeaderRow();
    expect(a).toMatchObject({ name: '', value: '' });
    expect(a.id).not.toBe(b.id);
  });
});
