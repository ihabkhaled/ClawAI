import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { McpTransport } from '../../../common/enums/mcp-transport.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { TargetKind } from '../../../common/enums/target-kind.enum';
import {
  type PluginManifest,
  type PluginManifestInput,
} from '../../catalog/schemas/plugin-manifest.schema';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { WEATHER_MANIFEST } from '../../seeding/constants/manifests/weather.manifest';
import { type CatalogTarget, type ServerTarget } from '../types/invoke.types';

export const USER = 'user-1';
export const INSTALL = '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10';
export const SERVER = '7a1c2d3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d';
export const CALL_ID = 'call-0123456789';

export function parsed(input: PluginManifestInput): PluginManifest {
  const result = parsePluginManifest(input);
  if (!result.ok) throw new Error('fixture manifest is invalid');
  return result.manifest;
}

export const MCP_REMOTE_INPUT: PluginManifestInput = {
  manifestVersion: 1,
  slug: 'vendor-mcp',
  version: '1.0.0',
  publisher: 'Vendor',
  category: 'dev',
  iconKey: 'plug',
  translations: { en: { name: 'Vendor', summary: 'Vendor tools', description: 'Vendor tools.' } },
  runtime: {
    kind: RuntimeKind.MCP_REMOTE,
    server: { url: 'https://mcp.vendor.example.com/mcp', transport: McpTransport.STREAMABLE_HTTP },
  },
  auth: { kind: AuthKind.API_KEY, headerName: 'X-API-Key' },
  tools: [
    {
      name: 'search',
      title: 'Search',
      description: 'Search the vendor.',
      inputSchema: {
        type: 'object',
        properties: { q: { type: 'string' } },
        additionalProperties: false,
      },
      riskLevel: RiskLevel.READ,
      scopes: [],
    },
  ],
};

export function builtinTarget(overrides: Partial<CatalogTarget> = {}): CatalogTarget {
  const manifest = parsed(WEATHER_MANIFEST);
  const tool = manifest.tools[0];
  return {
    kind: TargetKind.CATALOG,
    slug: manifest.slug,
    toolName: tool?.name ?? 'get_weather',
    title: tool?.title ?? 'Get the weather',
    riskLevel: RiskLevel.READ,
    consentGranted: false,
    inputSchema: tool?.inputSchema ?? {},
    timeoutMs: 10_000,
    maxResultBytes: 16_384,
    installId: INSTALL,
    pluginId: 'plugin-1',
    serverId: null,
    runtimeKind: RuntimeKind.BUILTIN,
    manifest,
    settings: {},
    credential: null,
    ...overrides,
  };
}

export function remoteCatalogTarget(overrides: Partial<CatalogTarget> = {}): CatalogTarget {
  const manifest = parsed(MCP_REMOTE_INPUT);
  return {
    ...builtinTarget(),
    slug: 'vendor-mcp',
    toolName: 'search',
    title: 'Search',
    inputSchema: manifest.tools[0]?.inputSchema ?? {},
    timeoutMs: 15_000,
    maxResultBytes: 65_536,
    runtimeKind: RuntimeKind.MCP_REMOTE,
    manifest,
    credential: { kind: AuthKind.API_KEY, headerName: 'X-API-Key', ciphertext: 'sealed' },
    ...overrides,
  };
}

export function serverTarget(overrides: Partial<ServerTarget> = {}): ServerTarget {
  return {
    kind: TargetKind.SERVER,
    slug: 'mcp7a1c2d3e4b5f',
    toolName: 'create_issue',
    title: 'create_issue',
    riskLevel: RiskLevel.WRITE,
    consentGranted: false,
    inputSchema: {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title'],
    },
    timeoutMs: null,
    maxResultBytes: null,
    installId: null,
    pluginId: null,
    serverId: SERVER,
    ownerUserId: USER,
    url: 'https://mcp.example.com/mcp',
    authKind: AuthKind.API_KEY,
    remoteName: 'create_issue',
    failureCount: 0,
    breakerOpenedAt: null,
    ...overrides,
  };
}
