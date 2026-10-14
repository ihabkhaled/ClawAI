import { describe, expect, it } from 'vitest';

import {
  readPluginCalls,
  readPluginNotices,
  readPluginRefs,
} from '@/utilities/plugin-call.utility';

describe('readPluginCalls', () => {
  const valid = {
    callId: 'c1',
    round: 2,
    pluginSlug: 'web-fetch',
    toolName: 'fetch_page',
    title: 'Fetch a page',
    riskLevel: 'READ',
    status: 'OK',
    durationMs: 33,
    truncated: true,
    resultExcerpt: 'hello',
  };

  it('reads a stored call', () => {
    expect(readPluginCalls({ pluginCalls: [valid] })).toEqual([valid]);
  });

  it('answers nothing for missing or malformed metadata', () => {
    expect(readPluginCalls(null)).toEqual([]);
    expect(readPluginCalls({})).toEqual([]);
    expect(readPluginCalls({ pluginCalls: 'x' })).toEqual([]);
    expect(readPluginCalls({ pluginCalls: [null, 5, 'x', {}] })).toEqual([]);
  });

  it('drops a call with an unknown status rather than rendering a raw key', () => {
    expect(readPluginCalls({ pluginCalls: [{ ...valid, status: 'WHATEVER' }] })).toEqual([]);
  });

  it('falls back sensibly for optional fields', () => {
    const [view] = readPluginCalls({
      pluginCalls: [{ callId: 'c', pluginSlug: 'p', toolName: 't', status: 'ERROR' }],
    });
    expect(view).toMatchObject({
      title: 't',
      riskLevel: 'READ',
      durationMs: 0,
      truncated: false,
      round: 0,
    });
    expect(view).not.toHaveProperty('resultExcerpt');
  });

  it('does not trust a prototype key as a status', () => {
    expect(readPluginCalls({ pluginCalls: [{ ...valid, status: 'constructor' }] })).toEqual([]);
  });
});

describe('readPluginNotices', () => {
  it('keeps known codes and drops the rest', () => {
    expect(
      readPluginNotices({
        pluginNotices: [{ code: 'PLUGIN_NO_TOOLS', pluginSlug: 'mail' }, { code: 'NOPE' }, 7],
      }),
    ).toEqual([{ code: 'PLUGIN_NO_TOOLS', pluginSlug: 'mail' }]);
  });

  it('answers nothing without metadata', () => {
    expect(readPluginNotices(null)).toEqual([]);
  });
});

describe('readPluginRefs', () => {
  it('reads the chips a message was sent with', () => {
    expect(
      readPluginRefs({
        pluginRefs: [
          { installId: 'a', label: 'Web fetch', toolName: 'fetch_page' },
          { installId: 'b' },
          'x',
        ],
      }),
    ).toEqual([{ installId: 'a', label: 'Web fetch' }]);
    expect(readPluginRefs(null)).toEqual([]);
  });
});
