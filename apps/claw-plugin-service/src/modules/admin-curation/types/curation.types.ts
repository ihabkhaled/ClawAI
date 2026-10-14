import type { AuthKind } from '../../../common/enums/auth-kind.enum';
import type { CatalogHealthStatus } from '../../../common/enums/catalog-health-status.enum';
import type { CatalogSource } from '../../../common/enums/catalog-source.enum';
import type { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import type { McpTransport } from '../../../common/enums/mcp-transport.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';
import type { ServerState } from '../../../common/enums/server-status.enum';
import type { PluginManifest } from '../../catalog/schemas/plugin-manifest.schema';
import type { CreateCuratedBody } from '../dto/curation.dto';

export type CuratedToolRecord = { name: string; riskLevel: RiskLevel; disabledByAdmin: boolean };

export type CuratedRecord = {
  id: string;
  slug: string;
  source: CatalogSource;
  status: CatalogStatus;
  category: string;
  publisher: string;
  iconKey: string;
  homepageUrl: string | null;
  translations: unknown;
  globallyEnabled: boolean;
  featured: boolean;
  installCount: number;
  deletedAt: Date | null;
  adminNotes: string | null;
  needsVerification: boolean;
  allowedPlanSlugs: string[];
  health: {
    status: CatalogHealthStatus;
    latencyMs: number | null;
    checkedAt: Date | null;
    errorCode: string | null;
  };
  current: {
    id: string;
    version: string;
    manifest: unknown;
    manifestHash: string;
    tools: CuratedToolRecord[];
  } | null;
};

export type NewCuratedEntry = {
  slug: string;
  status: CatalogStatus;
  globallyEnabled: boolean;
  needsVerification: boolean;
  category: string;
  publisher: string;
  iconKey: string;
  homepageUrl: string | null;
  translations: unknown;
  allowedPlanSlugs: string[];
  adminNotes: string | null;
  manifest: PluginManifest;
  manifestHash: string;
};

export type CuratedEntryUpdate = {
  status: CatalogStatus;
  needsVerification: boolean;
  category: string;
  publisher: string;
  iconKey: string;
  homepageUrl: string | null;
  translations: unknown;
  allowedPlanSlugs: string[];
  adminNotes: string | null;
};

export type HealthWrite = {
  status: CatalogHealthStatus;
  latencyMs: number | null;
  errorCode: string | null;
};

/** One tool the admin sees after a probe. `curatable` is false when its name cannot be a curated tool name. */
export type ProbedTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  defaultRisk: RiskLevel;
  curatable: boolean;
};

export type ProbeResult = {
  serverName: string | null;
  latencyMs: number;
  tools: ProbedTool[];
  skipped: Array<{ name: string; reason: string }>;
  ignored: number;
};

export type ProbeTarget = {
  url: string;
  transport: McpTransport;
  authKind: AuthKind;
  headerName?: string;
  credential?: string;
};

export type PendingServerRecord = {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string;
  url: string;
  urlHost: string;
  authKind: AuthKind;
  hasCredential: boolean;
  status: ServerState;
  serverInfo: unknown;
  toolsHash: string | null;
  createdAt: Date;
  decidedBy: string | null;
  decidedAt: Date | null;
  decisionReason: string | null;
  tools: Array<{ name: string; description: string; riskLevel: RiskLevel }>;
};

export type AuditWrite = {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: Record<string, unknown>;
};

export type AuditRecord = AuditWrite & { id: string; createdAt: Date };

export type CuratedManifestInput = {
  slug: CreateCuratedBody['slug'];
  version: string;
  publisher: CreateCuratedBody['publisher'];
  category: CreateCuratedBody['category'];
  iconKey: CreateCuratedBody['iconKey'];
  homepageUrl?: CreateCuratedBody['homepageUrl'];
  translations: CreateCuratedBody['translations'];
  server: CreateCuratedBody['server'];
  auth: CreateCuratedBody['auth'];
  tools: CreateCuratedBody['tools'];
};

export type ToolDraft = CreateCuratedBody['tools'][number];

/** What publishing needs to decide which tools to keep: the server, its auth, the declared tools. */
export type ResolveToolsInput = {
  server: CreateCuratedBody['server'];
  auth: CreateCuratedBody['auth'];
  tools: CreateCuratedBody['tools'];
  publish: CreateCuratedBody['publish'];
  probeCredential?: CreateCuratedBody['probeCredential'];
};

export type NewVersionWrite = {
  version: string;
  manifest: PluginManifest;
  manifestHash: string;
  /** Tool names the admin had switched off; the new version keeps them off. */
  disabledTools: string[];
};

export type ServerDecisionNotice = {
  serverId: string;
  ownerUserId: string;
  serverName: string;
  decidedAt: Date;
  /** Present on a rejection; travels as params.excerpt. */
  reason?: string;
};

export type CuratedSeedSummary = { created: string[]; unchanged: string[]; skipped: string[] };

/** The manifest an edit produces and, when it differs from the stored one, the version row to add. */
export type VersionPlan = {
  manifest: PluginManifest;
  version: string;
  write: NewVersionWrite | null;
};
