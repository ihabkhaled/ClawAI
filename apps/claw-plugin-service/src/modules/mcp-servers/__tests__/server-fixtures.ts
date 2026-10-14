import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { type ServerRecord, type ServerToolRecord } from '../types/mcp-server.types';

export const OWNER = 'user-owner';
export const SERVER_ID = '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10';

export function buildTool(overrides: Partial<ServerToolRecord> = {}): ServerToolRecord {
  return {
    name: 'create_issue',
    localName: 'create_issue',
    description: 'Create an issue.',
    inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
    schemaHash: 'hash-create-issue',
    riskLevel: RiskLevel.WRITE,
    enabled: true,
    consentGranted: false,
    ...overrides,
  };
}

export function buildServer(overrides: Partial<ServerRecord> = {}): ServerRecord {
  return {
    id: SERVER_ID,
    ownerUserId: OWNER,
    slug: 'mcp3f2b8f0e9d3c',
    name: 'My tracker',
    url: 'https://mcp.example.com/mcp',
    urlHost: 'mcp.example.com',
    authKind: AuthKind.API_KEY,
    status: ServerState.APPROVED,
    serverInfo: { name: 'Tracker', version: '1.0' },
    toolsHash: 'tools-hash-1',
    lastCheckedAt: new Date('2026-10-14T08:00:00.000Z'),
    lastErrorCode: null,
    failureCount: 0,
    breakerOpenedAt: null,
    createdAt: new Date('2026-10-14T07:00:00.000Z'),
    updatedAt: new Date('2026-10-14T07:00:00.000Z'),
    credential: { kind: AuthKind.API_KEY, updatedAt: new Date('2026-10-14T07:00:00.000Z') },
    tools: [buildTool()],
    ...overrides,
  };
}
