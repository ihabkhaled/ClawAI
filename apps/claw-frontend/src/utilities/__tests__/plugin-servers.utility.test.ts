import { describe, expect, it } from 'vitest';

import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { PluginServerAuthKind } from '@/enums/plugin-server-auth-kind.enum';
import { PluginServerCapState } from '@/enums/plugin-server-cap-state.enum';
import { PluginServerStatus } from '@/enums/plugin-server-status.enum';
import { ApiClientError } from '@/services/shared/api-client';
import {
  buildCreateServerRequest,
  isHttpsUrl,
  knownServerStatus,
  pluginServerErrorKey,
  serverCap,
  toDiscoveredTools,
  toServerList,
  toServerTool,
  toServerView,
} from '@/utilities/plugin-servers.utility';

const FORM = {
  name: ' Team tools ',
  url: ' https://mcp.example.com/mcp ',
  headerName: ' X-Api-Key ',
  headerValue: '',
  acknowledged: true,
};

describe('toServerTool', () => {
  it('defaults a missing risk to WRITE and a missing enabled flag to off', () => {
    expect(toServerTool({ name: 'search', description: 'Find things' })).toEqual({
      name: 'search',
      description: 'Find things',
      riskLevel: PluginRiskLevel.Write,
      enabled: false,
    });
  });

  it('keeps a known risk, reads the `risk` spelling, and ignores an unknown one', () => {
    expect(toServerTool({ name: 'a', riskLevel: 'READ', enabled: true })?.riskLevel).toBe(
      PluginRiskLevel.Read,
    );
    expect(toServerTool({ name: 'a', risk: 'DESTRUCTIVE' })?.riskLevel).toBe(
      PluginRiskLevel.Destructive,
    );
    expect(toServerTool({ name: 'a', riskLevel: 'SAFE' })?.riskLevel).toBe(PluginRiskLevel.Write);
  });

  it('drops a row with no name', () => {
    expect(toServerTool({ description: 'x' })).toBeUndefined();
    expect(toServerTool(null)).toBeUndefined();
  });
});

describe('toServerView', () => {
  it('reads either field spelling and counts enabled tools when no count is sent', () => {
    const view = toServerView({
      id: 's1',
      name: 'Mine',
      url: 'https://x.example.com',
      status: 'APPROVED',
      credentialSet: true,
      discoveredTools: [
        { name: 'a', enabled: true },
        { name: 'b', enabled: false },
      ],
    });
    expect(view).toMatchObject({ id: 's1', hasCredential: true, enabled: true, toolCount: 1 });
    expect(view?.tools).toHaveLength(2);
  });

  it('prefers a count the server sent, and treats enabled:false as off', () => {
    expect(toServerView({ id: 's1', toolCount: 7, enabled: false })).toMatchObject({
      toolCount: 7,
      enabled: false,
    });
  });

  it('never carries a credential value', () => {
    const view = toServerView({ id: 's1', credential: { value: 'secret' }, headerValue: 'secret' });
    expect(JSON.stringify(view)).not.toContain('secret');
  });

  it('drops a row with no id', () => {
    expect(toServerView({ name: 'x' })).toBeUndefined();
    expect(toServerView('nope')).toBeUndefined();
  });
});

describe('toServerList', () => {
  it('accepts a bare array with an unknown cap', () => {
    const list = toServerList([{ id: 'a' }, { name: 'no id' }]);
    expect(list.servers).toHaveLength(1);
    expect(list.limit).toBeUndefined();
  });

  it.each([
    [{ servers: [{ id: 'a' }], limit: 5 }, 5],
    [{ items: [{ id: 'a' }], maxServers: 0 }, 0],
    [{ data: [{ id: 'a' }], cap: null }, null],
    [{ servers: [], planLimit: 'many' }, undefined],
  ])('reads the cap from %j', (raw, expected) => {
    expect(toServerList(raw).limit).toBe(expected);
  });

  it('survives garbage', () => {
    expect(toServerList(null)).toEqual({ servers: [], limit: undefined });
    expect(toServerList({ servers: 'x' }).servers).toEqual([]);
  });
});

describe('toDiscoveredTools', () => {
  it('accepts an array, {tools}, or the server itself', () => {
    expect(toDiscoveredTools([{ name: 'a' }])).toHaveLength(1);
    expect(toDiscoveredTools({ tools: [{ name: 'a' }, { name: 'b' }] })).toHaveLength(2);
    expect(toDiscoveredTools({ discoveredTools: [{ name: 'a' }] })).toHaveLength(1);
    expect(toDiscoveredTools('x')).toEqual([]);
  });
});

describe('serverCap', () => {
  it('shows "2 of 5" and stops adding at the limit', () => {
    expect(serverCap(2, 5)).toEqual({
      state: PluginServerCapState.Limited,
      current: 2,
      limit: 5,
      canAdd: true,
    });
    expect(serverCap(5, 5).canAdd).toBe(false);
  });

  it('treats 0 as disabled, null as unlimited, undefined as unknown', () => {
    expect(serverCap(0, 0)).toMatchObject({ state: PluginServerCapState.Disabled, canAdd: false });
    expect(serverCap(40, null)).toMatchObject({
      state: PluginServerCapState.Unlimited,
      canAdd: true,
    });
    expect(serverCap(1, undefined)).toMatchObject({
      state: PluginServerCapState.Unknown,
      canAdd: true,
    });
  });
});

describe('pluginServerErrorKey', () => {
  const failure = (code: string, status = 422): ApiClientError =>
    new ApiClientError({ message: 'x', status, code });

  it('maps the contract codes', () => {
    expect(pluginServerErrorKey(failure('PLUGIN_SERVER_URL_REFUSED'))).toBe(
      'pluginsServers.errors.urlRefused',
    );
    expect(pluginServerErrorKey(failure('PLUGIN_SERVER_LIMIT_REACHED', 403))).toBe(
      'pluginsServers.errors.limitReached',
    );
  });

  it('falls back to the shared plugin errors, then the generic one', () => {
    expect(pluginServerErrorKey(failure('PLUGIN_PLAN_DISABLED', 403))).toBe(
      'pluginsStatus.errors.planDisabled',
    );
    expect(pluginServerErrorKey(new Error('boom'))).toBe('pluginsInstall.errors.generic');
  });
});

describe('isHttpsUrl', () => {
  it.each([
    ['https://mcp.example.com/mcp', true],
    ['  https://mcp.example.com  ', true],
    ['http://mcp.example.com', false],
    ['ftp://mcp.example.com', false],
    ['javascript:alert(1)', false],
    ['mcp.example.com', false],
    ['', false],
  ])('%s -> %s', (value, expected) => {
    expect(isHttpsUrl(value)).toBe(expected);
  });
});

describe('knownServerStatus', () => {
  it('knows the six statuses and nothing else', () => {
    for (const status of Object.values(PluginServerStatus)) {
      expect(knownServerStatus(status)).toBe(status);
    }
    expect(knownServerStatus('SOMETHING_NEW')).toBeUndefined();
  });
});

describe('buildCreateServerRequest', () => {
  it('sends no credential when no key was typed', () => {
    expect(buildCreateServerRequest(FORM)).toEqual({
      name: 'Team tools',
      url: 'https://mcp.example.com/mcp',
      authKind: PluginServerAuthKind.None,
      acknowledgedRisk: true,
    });
  });

  it('sends the key under the named header, and defaults the header name', () => {
    expect(buildCreateServerRequest({ ...FORM, headerValue: 'k-1' })).toMatchObject({
      authKind: PluginServerAuthKind.ApiKey,
      credential: { headerName: 'X-Api-Key', value: 'k-1' },
    });
    expect(
      buildCreateServerRequest({ ...FORM, headerName: ' ', headerValue: 'k-1' }),
    ).toMatchObject({ credential: { headerName: 'Authorization' } });
  });
});
