import { type Mock } from 'vitest';

import { CatalogHealthStatus } from '../../../common/enums/catalog-health-status.enum';
import { CatalogSource } from '../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { McpTransport } from '../../../common/enums/mcp-transport.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { SafeEgressManager } from '../../egress/managers/safe-egress.manager';
import { publicResolver } from '../../egress/__tests__/egress-test-doubles';
import { type HostResolver } from '../../egress/resolvers/host-resolver';
import { HostRulePolicyManager } from '../../host-rules/managers/host-rule-policy.manager';
import { type HostRuleRecord } from '../../host-rules/types/host-rules.types';
import { McpClientManager } from '../../mcp-servers/managers/mcp-client.manager';
import { McpToolSnapshotManager } from '../../mcp-servers/managers/mcp-tool-snapshot.manager';
import { type FakeMcpOptions, FakeMcpTransport } from '../../mcp-servers/__tests__/fake-mcp-server';
import { type CreateCuratedBody } from '../dto/curation.dto';
import { CuratedManifestManager } from '../managers/curated-manifest.manager';
import { CuratedPresenterManager } from '../managers/curated-presenter.manager';
import { CuratedProbeManager } from '../managers/curated-probe.manager';
import { AdminAuditService } from '../services/admin-audit.service';
import { CuratedCatalogService } from '../services/curated-catalog.service';
import {
  type CuratedEntryUpdate,
  type CuratedRecord,
  type HealthWrite,
  type NewCuratedEntry,
  type NewVersionWrite,
} from '../types/curation.types';

export const ADMIN = 'admin-1';

export const SEARCH_TOOL = {
  name: 'search_docs',
  description: 'Search the vendor documentation.',
  inputSchema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
};

/** An in-memory stand-in for the curated catalog repository, keeping the same rules as the SQL. */
export class FakeCuratedRepository {
  readonly records = new Map<string, CuratedRecord>();

  findAllCurated(includeDeleted: boolean): Promise<CuratedRecord[]> {
    return Promise.resolve(
      [...this.records.values()].filter(
        (record) =>
          record.source === CatalogSource.CURATED_MCP && (includeDeleted || !record.deletedAt),
      ),
    );
  }

  findBySlug(slug: string): Promise<CuratedRecord | null> {
    return Promise.resolve(this.records.get(slug) ?? null);
  }

  slugExists(slug: string): Promise<boolean> {
    return Promise.resolve(this.records.has(slug));
  }

  create(input: NewCuratedEntry, version: string): Promise<void> {
    this.records.set(input.slug, {
      id: `id-${input.slug}`,
      slug: input.slug,
      source: CatalogSource.CURATED_MCP,
      status: input.status,
      category: input.category,
      publisher: input.publisher,
      iconKey: input.iconKey,
      homepageUrl: input.homepageUrl,
      translations: input.translations,
      globallyEnabled: input.globallyEnabled,
      featured: false,
      installCount: 0,
      deletedAt: null,
      adminNotes: input.adminNotes,
      needsVerification: input.needsVerification,
      allowedPlanSlugs: input.allowedPlanSlugs,
      health: {
        status: CatalogHealthStatus.UNKNOWN,
        latencyMs: null,
        checkedAt: null,
        errorCode: null,
      },
      current: {
        id: `v-${input.slug}-${version}`,
        version,
        manifest: input.manifest,
        manifestHash: input.manifestHash,
        tools: input.manifest.tools.map((tool) => ({
          name: tool.name,
          riskLevel: tool.riskLevel,
          disabledByAdmin: false,
        })),
      },
    });
    return Promise.resolve();
  }

  update(
    entryId: string,
    update: CuratedEntryUpdate,
    version: NewVersionWrite | null,
  ): Promise<void> {
    const record = [...this.records.values()].find((candidate) => candidate.id === entryId);
    if (record === undefined) return Promise.reject(new Error('missing'));
    Object.assign(record, update);
    if (version !== null) {
      record.current = {
        id: `v-${record.slug}-${version.version}`,
        version: version.version,
        manifest: version.manifest,
        manifestHash: version.manifestHash,
        tools: version.manifest.tools.map((tool) => ({
          name: tool.name,
          riskLevel: tool.riskLevel,
          disabledByAdmin: version.disabledTools.includes(tool.name),
        })),
      };
    }
    return Promise.resolve();
  }

  setEnabled(entryId: string, enabled: boolean): Promise<void> {
    const record = [...this.records.values()].find((candidate) => candidate.id === entryId);
    if (record !== undefined) record.globallyEnabled = enabled;
    return Promise.resolve();
  }

  softDelete(entryId: string): Promise<void> {
    const record = [...this.records.values()].find((candidate) => candidate.id === entryId);
    if (record !== undefined) {
      record.deletedAt = new Date('2026-10-15T10:00:00.000Z');
      record.status = CatalogStatus.HIDDEN;
      record.globallyEnabled = false;
      record.featured = false;
    }
    return Promise.resolve();
  }

  writeHealth(entryId: string, health: HealthWrite): Promise<void> {
    const record = [...this.records.values()].find((candidate) => candidate.id === entryId);
    if (record !== undefined) {
      record.health = { ...health, checkedAt: new Date('2026-10-15T10:00:00.000Z') };
    }
    return Promise.resolve();
  }
}

export function curatedBody(overrides: Partial<CreateCuratedBody> = {}): CreateCuratedBody {
  return {
    slug: 'vendor-docs',
    publisher: 'Vendor',
    category: 'dev',
    iconKey: 'code',
    translations: {
      en: {
        name: 'Vendor Docs',
        summary: 'Search the vendor documentation.',
        description: 'Searches the vendor documentation and returns the matching pages.',
      },
    },
    server: { url: 'https://mcp.vendor.example.com/mcp', transport: McpTransport.STREAMABLE_HTTP },
    auth: { kind: AuthKind.NONE },
    tools: [{ name: 'search_docs', description: 'Search the docs.', riskLevel: RiskLevel.READ }],
    allowedPlanSlugs: [],
    publish: false,
    ...overrides,
  };
}

export type CurationHarness = {
  service: CuratedCatalogService;
  repository: FakeCuratedRepository;
  transport: FakeMcpTransport;
  manifests: CuratedManifestManager;
  probe: CuratedProbeManager;
  policy: HostRulePolicyManager;
  audit: AdminAuditService;
  auditRepository: { write: Mock; findRecent: Mock };
  rulesRepository: { findAll: Mock };
};

export type Harness = CurationHarness;

export function buildHarness(
  options: FakeMcpOptions = { tools: [SEARCH_TOOL] },
  rules: HostRuleRecord[] = [],
  resolver: HostResolver = publicResolver(),
): CurationHarness {
  const transport = new FakeMcpTransport(options);
  const client = new McpClientManager(new SafeEgressManager(resolver, transport));
  const manifests = new CuratedManifestManager();
  const rulesRepository = { findAll: vi.fn().mockResolvedValue(rules) };
  const policy = new HostRulePolicyManager(rulesRepository as never);
  const probe = new CuratedProbeManager(client, new McpToolSnapshotManager(), manifests, policy);
  const repository = new FakeCuratedRepository();
  const auditRepository = { write: vi.fn().mockResolvedValue(undefined), findRecent: vi.fn() };
  const audit = new AdminAuditService(auditRepository as never);
  const service = new CuratedCatalogService(
    repository as never,
    manifests,
    probe,
    new CuratedPresenterManager(),
    policy,
    audit,
  );
  return {
    service,
    repository,
    transport,
    manifests,
    probe,
    policy,
    audit,
    auditRepository,
    rulesRepository,
  };
}

export async function errorCodeOf(work: Promise<unknown>): Promise<string | undefined> {
  const failure = (await work.then(
    () => null,
    (error: unknown) => error,
  )) as { getResponse?: () => unknown } | null;
  const response = failure?.getResponse?.();
  return typeof response === 'object' && response !== null && 'errorCode' in response
    ? String((response as { errorCode: unknown }).errorCode)
    : undefined;
}

export function auditActions(harness: Harness): string[] {
  return harness.auditRepository.write.mock.calls.map(
    (call: unknown[]) => (call[0] as { action: string }).action,
  );
}
