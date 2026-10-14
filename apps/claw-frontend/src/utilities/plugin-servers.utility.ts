import {
  PLUGIN_SERVER_DEFAULT_HEADER_NAME,
  PLUGIN_SERVER_DEFAULT_RISK,
  PLUGIN_SERVER_ERROR_KEYS,
} from '@/constants/plugin-servers.constants';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { PluginServerAuthKind } from '@/enums/plugin-server-auth-kind.enum';
import { PluginServerCapState } from '@/enums/plugin-server-cap-state.enum';
import { PluginServerStatus } from '@/enums/plugin-server-status.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  CreatePluginServerRequest,
  PluginServerCap,
  PluginServerFormValues,
  PluginServerLimit,
  PluginServerList,
  PluginServerTool,
  PluginServerView,
} from '@/types/plugin-servers.types';

import { pluginErrorKey } from './plugin-installs.utility';

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function firstOf(source: Dict, keys: readonly string[]): unknown {
  const found = keys.find((key) => source[key] !== undefined);
  return found === undefined ? undefined : source[found];
}

const RISK_VALUES: ReadonlySet<string> = new Set(Object.values(PluginRiskLevel));

function toRisk(value: unknown): PluginRiskLevel {
  if (typeof value !== 'string' || !RISK_VALUES.has(value)) {
    return PLUGIN_SERVER_DEFAULT_RISK;
  }
  return (
    Object.values(PluginRiskLevel).find((risk) => risk === value) ?? PLUGIN_SERVER_DEFAULT_RISK
  );
}

/** One tool row. A tool the server did not flag as enabled stays off, and a missing risk is WRITE. */
export function toServerTool(raw: unknown): PluginServerTool | undefined {
  if (!isDict(raw) || text(raw.name) === '') {
    return undefined;
  }
  return {
    name: text(raw.name),
    description: text(raw.description),
    riskLevel: toRisk(raw.riskLevel ?? raw.risk),
    enabled: raw.enabled === true,
  };
}

function toTools(raw: unknown): PluginServerTool[] {
  return Array.isArray(raw)
    ? raw.map(toServerTool).filter((tool): tool is PluginServerTool => tool !== undefined)
    : [];
}

/** A server row from either field spelling the backend may use. Returns undefined for a row with no id. */
export function toServerView(raw: unknown): PluginServerView | undefined {
  if (!isDict(raw) || text(raw.id) === '') {
    return undefined;
  }
  const tools = toTools(raw.tools ?? raw.discoveredTools);
  const count = firstOf(raw, ['toolCount', 'toolsCount']);
  return {
    id: text(raw.id),
    name: text(raw.name),
    url: text(raw.url),
    status: text(raw.status),
    enabled: raw.enabled !== false,
    hasCredential: firstOf(raw, ['hasCredential', 'credentialSet']) === true,
    tools,
    toolCount: typeof count === 'number' ? count : tools.filter((tool) => tool.enabled).length,
  };
}

function toLimit(source: Dict): PluginServerLimit {
  const value = firstOf(source, ['limit', 'maxServers', 'cap', 'planLimit']);
  if (value === null) {
    return null;
  }
  return typeof value === 'number' ? value : undefined;
}

function rowsOf(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    return raw;
  }
  return isDict(raw) ? firstOf(raw, ['servers', 'items', 'data']) : [];
}

/** GET /plugins/servers: a bare array, or an object holding the array plus the plan cap. */
export function toServerList(raw: unknown): PluginServerList {
  const rows = rowsOf(raw);
  const servers = Array.isArray(rows)
    ? rows.map(toServerView).filter((server): server is PluginServerView => server !== undefined)
    : [];
  return { servers, limit: isDict(raw) ? toLimit(raw) : undefined };
}

/** POST /plugins/servers/:id/discover: a tool array, `{tools}`, or the server itself. */
export function toDiscoveredTools(raw: unknown): PluginServerTool[] {
  if (Array.isArray(raw)) {
    return toTools(raw);
  }
  return isDict(raw) ? toTools(firstOf(raw, ['tools', 'discoveredTools'])) : [];
}

/** "2 of 5", unlimited, disabled or unknown, and whether one more can be added. */
export function serverCap(count: number, limit: PluginServerLimit): PluginServerCap {
  if (limit === undefined) {
    return { state: PluginServerCapState.Unknown, current: count, limit: null, canAdd: true };
  }
  if (limit === null) {
    return { state: PluginServerCapState.Unlimited, current: count, limit: null, canAdd: true };
  }
  if (limit <= 0) {
    return { state: PluginServerCapState.Disabled, current: count, limit: 0, canAdd: false };
  }
  return { state: PluginServerCapState.Limited, current: count, limit, canAdd: count < limit };
}

/** The key for a failed server call: the server codes first, then the shared plugin errors. */
export function pluginServerErrorKey(error: unknown): string {
  if (error instanceof ApiClientError && error.code !== undefined) {
    const key = Object.hasOwn(PLUGIN_SERVER_ERROR_KEYS, error.code)
      ? PLUGIN_SERVER_ERROR_KEYS[error.code]
      : undefined;
    if (key !== undefined) {
      return key;
    }
  }
  return pluginErrorKey(error);
}

/** Only an https address with a host is worth sending; the server still decides what is allowed. */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
}

/** The known status behind a server's status text, or undefined for one this build has no label for. */
export function knownServerStatus(status: string): PluginServerStatus | undefined {
  return Object.values(PluginServerStatus).find((value) => value === status);
}

/** The create call for the form: a key is sent only when one was typed, under the header the user named. */
export function buildCreateServerRequest(
  values: PluginServerFormValues,
): CreatePluginServerRequest {
  const base = {
    name: values.name.trim(),
    url: values.url.trim(),
    acknowledgedRisk: true,
  } as const;
  if (values.headerValue.trim() === '') {
    return { ...base, authKind: PluginServerAuthKind.None };
  }
  return {
    ...base,
    authKind: PluginServerAuthKind.ApiKey,
    credential: {
      headerName: values.headerName.trim() || PLUGIN_SERVER_DEFAULT_HEADER_NAME,
      value: values.headerValue,
    },
  };
}
