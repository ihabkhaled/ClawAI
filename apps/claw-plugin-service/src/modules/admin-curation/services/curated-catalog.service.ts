import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type CuratedEntryView,
  type CuratedPreviewToolView,
  type CuratedPreviewView,
} from '@claw/shared-types';

import { AdminAuditAction, AdminAuditTarget } from '../../../common/enums/admin-audit-action.enum';
import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CatalogHealthStatus } from '../../../common/enums/catalog-health-status.enum';
import { CatalogSource } from '../../../common/enums/catalog-source.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { CurationErrorCode } from '../../../common/enums/curation-error-code.enum';
import { McpFailureKind } from '../../../common/enums/mcp-failure-kind.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { computeManifestHash } from '../../catalog/utilities/compute-manifest-hash.utility';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { HostRulePolicyManager } from '../../host-rules/managers/host-rule-policy.manager';
import { McpFailure } from '../../mcp-servers/errors/mcp-failure.error';
import { mcpFailureFromEgress } from '../../mcp-servers/utilities/mcp-failure-from-egress.utility';
import { CURATED_FIRST_VERSION } from '../constants/curation.constants';
import {
  type CreateCuratedBody,
  type PreviewCuratedBody,
  type UpdateCuratedBody,
} from '../dto/curation.dto';
import { CuratedManifestManager } from '../managers/curated-manifest.manager';
import { CuratedPresenterManager } from '../managers/curated-presenter.manager';
import { CuratedProbeManager } from '../managers/curated-probe.manager';
import { CuratedCatalogRepository } from '../repositories/curated-catalog.repository';
import {
  type CuratedManifestInput,
  type CuratedRecord,
  type ProbeResult,
  type ProbeTarget,
  type ResolveToolsInput,
  type ToolDraft,
  type VersionPlan,
} from '../types/curation.types';
import { bumpPatchVersion } from '../utilities/bump-patch-version.utility';
import { AdminAuditService } from './admin-audit.service';

/**
 * Admin curation of the remote-MCP part of the catalog: create, edit (a new version), switch on or
 * off, soft delete, preview the tools a server lists and check its health. Every write leaves an
 * audit row. A published entry has been probed: each tool it declares is one the server listed, with
 * the server's own schema. A draft is not probed and cannot be switched on.
 */
@Injectable()
export class CuratedCatalogService {
  private readonly logger = new Logger(CuratedCatalogService.name);

  constructor(
    private readonly repository: CuratedCatalogRepository,
    private readonly manifests: CuratedManifestManager,
    private readonly probe: CuratedProbeManager,
    private readonly presenter: CuratedPresenterManager,
    private readonly policy: HostRulePolicyManager,
    private readonly audit: AdminAuditService,
  ) {}

  async list(includeDeleted: boolean): Promise<CuratedEntryView[]> {
    const records = await this.repository.findAllCurated(includeDeleted);
    return records.map((record) => this.presenter.toView(record));
  }

  async get(slug: string): Promise<CuratedEntryView> {
    return this.presenter.toView(await this.requireCurated(slug, true));
  }

  async preview(body: PreviewCuratedBody): Promise<CuratedPreviewView> {
    const result = await this.runProbe({
      url: body.url,
      transport: body.transport,
      authKind: body.auth.kind,
      headerName: 'headerName' in body.auth ? body.auth.headerName : undefined,
      credential: body.credential,
    });
    return {
      serverName: result.serverName,
      latencyMs: result.latencyMs,
      tools: result.tools.map((tool): CuratedPreviewToolView => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        defaultRisk: tool.defaultRisk,
        curatable: tool.curatable,
      })),
      skipped: result.skipped,
      ignored: result.ignored,
    };
  }

  async create(adminId: string, body: CreateCuratedBody): Promise<CuratedEntryView> {
    if (await this.repository.slugExists(body.slug)) {
      throw new ConflictException({
        message: 'That slug is already used',
        errorCode: CurationErrorCode.SLUG_TAKEN,
      });
    }
    const url = this.manifests.checkUrl(body.server.url);
    await this.policy.assertAllowed({
      host: url.hostname,
      publisher: body.publisher,
      slug: body.slug,
    });
    const tools = await this.resolveTools(body);
    const manifest = this.manifests.build({ ...body, tools, version: CURATED_FIRST_VERSION });
    await this.repository.create(
      {
        slug: body.slug,
        status: body.publish ? CatalogStatus.PUBLISHED : CatalogStatus.DRAFT,
        globallyEnabled: body.publish,
        needsVerification: false,
        category: manifest.category,
        publisher: manifest.publisher,
        iconKey: manifest.iconKey,
        homepageUrl: manifest.homepageUrl ?? null,
        translations: manifest.translations,
        allowedPlanSlugs: body.allowedPlanSlugs,
        adminNotes: body.adminNotes ?? null,
        manifest,
        manifestHash: computeManifestHash(manifest),
      },
      CURATED_FIRST_VERSION,
    );
    await this.audit.record(
      adminId,
      AdminAuditAction.CATALOG_CREATED,
      AdminAuditTarget.CATALOG_ENTRY,
      body.slug,
      {
        status: body.publish ? CatalogStatus.PUBLISHED : CatalogStatus.DRAFT,
        host: url.hostname,
        toolCount: tools.length,
        version: CURATED_FIRST_VERSION,
      },
    );
    this.logger.log(`create: admin=${adminId} slug=${body.slug} host=${url.hostname}`);
    return this.get(body.slug);
  }

  async update(adminId: string, slug: string, body: UpdateCuratedBody): Promise<CuratedEntryView> {
    const record = await this.requireCurated(slug, false);
    const url = this.manifests.checkUrl(body.server.url);
    await this.policy.assertAllowed({ host: url.hostname, publisher: body.publisher, slug });
    const tools = await this.resolveTools(body);
    const plan = this.planVersion(record, { ...body, slug, tools });
    const status = body.publish ? CatalogStatus.PUBLISHED : CatalogStatus.DRAFT;
    await this.repository.update(
      record.id,
      {
        status,
        needsVerification: record.needsVerification && !body.publish,
        category: plan.manifest.category,
        publisher: plan.manifest.publisher,
        iconKey: plan.manifest.iconKey,
        homepageUrl: plan.manifest.homepageUrl ?? null,
        translations: plan.manifest.translations,
        allowedPlanSlugs: body.allowedPlanSlugs,
        adminNotes: body.adminNotes ?? null,
      },
      plan.write,
    );
    await this.audit.record(
      adminId,
      AdminAuditAction.CATALOG_UPDATED,
      AdminAuditTarget.CATALOG_ENTRY,
      slug,
      {
        status,
        host: url.hostname,
        toolCount: tools.length,
        versionBumped: plan.write !== null,
        version: plan.version,
        previousVersion: record.current?.version ?? null,
      },
    );
    this.logger.log(
      `update: admin=${adminId} slug=${slug} versionBumped=${String(plan.write !== null)}`,
    );
    return this.get(slug);
  }

  /** The kill switch. A curated entry that is a draft or still unverified cannot be switched on. */
  async setEnabled(adminId: string, slug: string, enabled: boolean): Promise<CuratedEntryView> {
    const record = await this.requireEntry(slug);
    if (enabled && (record.status !== CatalogStatus.PUBLISHED || record.needsVerification)) {
      throw new ConflictException({
        message: 'Publish the entry after a successful tool preview before switching it on',
        errorCode: CurationErrorCode.NEEDS_VERIFICATION,
      });
    }
    await this.repository.setEnabled(record.id, enabled);
    await this.audit.record(
      adminId,
      enabled ? AdminAuditAction.CATALOG_ENABLED : AdminAuditAction.CATALOG_DISABLED,
      AdminAuditTarget.CATALOG_ENTRY,
      slug,
      { source: record.source },
    );
    return this.presenter.toView((await this.repository.findBySlug(slug)) ?? record);
  }

  async remove(adminId: string, slug: string): Promise<void> {
    const record = await this.requireCurated(slug, false);
    await this.repository.softDelete(record.id);
    await this.audit.record(
      adminId,
      AdminAuditAction.CATALOG_DELETED,
      AdminAuditTarget.CATALOG_ENTRY,
      slug,
      { installCount: record.installCount },
    );
    this.logger.log(`remove: admin=${adminId} slug=${slug} soft-deleted`);
  }

  /** One bounded tools/list ping with no credential. A server that wants a key and answers 'no' is UNKNOWN, not DOWN. */
  async checkHealth(adminId: string, slug: string): Promise<CuratedEntryView> {
    const record = await this.requireCurated(slug, false);
    const target = this.healthTarget(record);
    const started = Date.now();
    let status = CatalogHealthStatus.OK;
    let errorCode: string | null = null;
    let latencyMs: number | null = null;
    try {
      latencyMs = (await this.probe.run(target)).latencyMs;
    } catch (error) {
      latencyMs = Date.now() - started;
      ({ status, errorCode } = this.classifyFailure(error, target.authKind));
    }
    await this.repository.writeHealth(record.id, { status, latencyMs, errorCode });
    await this.audit.record(
      adminId,
      AdminAuditAction.CATALOG_HEALTH_CHECKED,
      AdminAuditTarget.CATALOG_ENTRY,
      slug,
      { status, latencyMs, errorCode },
    );
    return this.get(slug);
  }

  /** A manifest that differs from the stored one is a new patch version; an identical one is not. */
  private planVersion(
    record: CuratedRecord,
    input: Omit<CuratedManifestInput, 'version'>,
  ): VersionPlan {
    const currentVersion = record.current?.version ?? null;
    const sameVersion = this.manifests.build({
      ...input,
      version: currentVersion ?? CURATED_FIRST_VERSION,
    });
    const unchanged =
      record.current !== null && computeManifestHash(sameVersion) === record.current.manifestHash;
    if (unchanged) {
      return {
        manifest: sameVersion,
        version: currentVersion ?? CURATED_FIRST_VERSION,
        write: null,
      };
    }
    const version =
      currentVersion === null
        ? CURATED_FIRST_VERSION
        : bumpPatchVersion(currentVersion, CURATED_FIRST_VERSION);
    const manifest = this.manifests.build({ ...input, version });
    return {
      manifest,
      version,
      write: {
        version,
        manifest,
        manifestHash: computeManifestHash(manifest),
        disabledTools: (record.current?.tools ?? [])
          .filter((tool) => tool.disabledByAdmin)
          .map((tool) => tool.name),
      },
    };
  }

  private classifyFailure(
    error: unknown,
    authKind: AuthKind,
  ): { status: CatalogHealthStatus; errorCode: string } {
    if (error instanceof McpFailure || !this.isHttpError(error)) {
      const failure = mcpFailureFromEgress(error);
      return failure.kind === McpFailureKind.REJECTED && authKind !== AuthKind.NONE
        ? { status: CatalogHealthStatus.UNKNOWN, errorCode: 'AUTH_REQUIRED' }
        : { status: CatalogHealthStatus.DOWN, errorCode: failure.kind };
    }
    const code = this.codeOf(error);
    return { status: CatalogHealthStatus.DOWN, errorCode: code };
  }

  private isHttpError(error: unknown): error is { getResponse: () => unknown } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'getResponse' in error &&
      typeof (error as { getResponse: unknown }).getResponse === 'function'
    );
  }

  private codeOf(error: { getResponse: () => unknown }): string {
    const response = error.getResponse();
    if (typeof response === 'object' && response !== null && 'errorCode' in response) {
      const code = (response as { errorCode: unknown }).errorCode;
      if (typeof code === 'string') return code;
    }
    return 'BLOCKED';
  }

  private healthTarget(record: CuratedRecord): ProbeTarget {
    const parsed = record.current === null ? null : parsePluginManifest(record.current.manifest);
    const runtime = parsed?.ok === true ? parsed.manifest.runtime : null;
    if (runtime?.kind !== RuntimeKind.MCP_REMOTE) {
      throw new UnprocessableEntityException({
        message: 'The entry has no readable server address',
        errorCode: CurationErrorCode.MANIFEST_INVALID,
      });
    }
    const auth = parsed?.ok === true ? parsed.manifest.auth : { kind: AuthKind.NONE };
    return { url: runtime.server.url, transport: runtime.server.transport, authKind: auth.kind };
  }

  /**
   * A draft keeps the tools the admin typed. Publishing needs a successful probe, and each declared
   * tool must be one the server listed under a usable name; the server's description and schema win.
   */
  private async resolveTools(body: ResolveToolsInput): Promise<ToolDraft[]> {
    if (!body.publish) return body.tools;
    if (body.auth.kind === AuthKind.OAUTH2_PKCE) {
      throw new UnprocessableEntityException({
        message: 'OAuth entries can be saved as drafts only; OAuth is not available yet',
        errorCode: CurationErrorCode.OAUTH_UNSUPPORTED,
      });
    }
    const result = await this.runProbe({
      url: body.server.url,
      transport: body.server.transport,
      authKind: body.auth.kind,
      headerName: 'headerName' in body.auth ? body.auth.headerName : undefined,
      credential: body.probeCredential,
    });
    const listed = new Map(result.tools.filter((tool) => tool.curatable).map((t) => [t.name, t]));
    const missing = body.tools.filter((tool) => !listed.has(tool.name)).map((tool) => tool.name);
    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        message: 'The server does not list these tools under a usable name',
        errorCode: CurationErrorCode.TOOLS_UNVERIFIED,
        missing: missing.slice(0, 20),
      });
    }
    return body.tools.map((tool) => {
      const probed = listed.get(tool.name);
      return {
        ...tool,
        description:
          probed?.description === '' ? tool.description : (probed?.description ?? tool.description),
        inputSchema: probed?.inputSchema ?? tool.inputSchema,
      };
    });
  }

  private async runProbe(target: ProbeTarget): Promise<ProbeResult> {
    try {
      return await this.probe.run(target);
    } catch (error) {
      if (this.isHttpError(error)) throw error;
      const failure = mcpFailureFromEgress(error);
      this.logger.warn(`runProbe: ${failure.kind} ${failure.detail}`);
      throw new BadGatewayException({
        message: 'The server could not be probed',
        errorCode: CurationErrorCode.PROBE_FAILED,
        reason: failure.kind,
      });
    }
  }

  private async requireEntry(slug: string): Promise<CuratedRecord> {
    const record = await this.repository.findBySlug(slug);
    if (record?.deletedAt !== null) throw this.notFound();
    return record;
  }

  private async requireCurated(slug: string, allowDeleted: boolean): Promise<CuratedRecord> {
    const record = await this.repository.findBySlug(slug);
    if (record === null || (!allowDeleted && record.deletedAt !== null)) throw this.notFound();
    if (record.source !== CatalogSource.CURATED_MCP) {
      throw new ConflictException({
        message: 'Only curated MCP entries can be edited here',
        errorCode: CurationErrorCode.NOT_CURATED,
      });
    }
    return record;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      message: 'Plugin not found',
      errorCode: CurationErrorCode.NOT_FOUND,
    });
  }
}
