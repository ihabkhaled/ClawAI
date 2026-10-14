import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import type { ServerRecord, ServerRow } from '../types/mcp-server.types';

export function mapServerRow(row: ServerRow): ServerRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    slug: row.slug,
    name: row.name,
    url: row.url,
    urlHost: row.urlHost,
    authKind: AuthKind[row.authKind],
    status: ServerState[row.status],
    serverInfo: row.serverInfo,
    toolsHash: row.toolsHash,
    lastCheckedAt: row.lastCheckedAt,
    lastErrorCode: row.lastErrorCode,
    failureCount: row.failureCount,
    breakerOpenedAt: row.breakerOpenedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    credential:
      row.credential === null
        ? null
        : { kind: AuthKind[row.credential.kind], updatedAt: row.credential.updatedAt },
    tools: row.tools.map((tool) => ({
      name: tool.name,
      localName: tool.localName,
      description: tool.description,
      inputSchema: tool.inputSchema,
      schemaHash: tool.schemaHash,
      riskLevel: RiskLevel[tool.riskLevel],
      enabled: tool.enabled,
      consentGranted: tool.consentGranted,
    })),
  };
}
