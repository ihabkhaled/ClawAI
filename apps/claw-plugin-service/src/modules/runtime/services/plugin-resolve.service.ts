import { ForbiddenException, Injectable } from '@nestjs/common';

import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../common/enums/install-status.enum';
import { NATIVE_TOOL_PREFIX } from '../../catalog/constants/catalog.constants';
import { type PluginManifest } from '../../catalog/schemas/plugin-manifest.schema';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { OwnServerOffersManager } from '../../own-servers-chat/managers/own-server-offers.manager';
import { RuntimeSettingsManager } from '../../runtime-settings/managers/runtime-settings.manager';
import {
  RESOLVE_NOTICE_NO_TOOLS,
  RESOLVE_SYSTEM_BLOCK_DESCRIPTION_MAX,
} from '../constants/internal-plugin.constants';
import { type InternalResolveBody } from '../dto/internal-plugin.dto';
import { RuntimePlanGateManager } from '../managers/runtime-plan-gate.manager';
import { InvokeTargetsRepository } from '../repositories/invoke-targets.repository';
import {
  type ResolvedOffer,
  type ResolvedTool,
  type ResolveMention,
  type ResolveNotice,
  type ResolveResponse,
} from '../types/resolve.types';
import { type InstallTargetRecord } from '../types/target-record.types';

/**
 * POST /internal/plugins/resolve. Turns the `@mention` chips of one message into the native tools
 * the model may call this turn. Only the caller's own, enabled, available installs offer tools;
 * anything else is dropped without a word about why (the same as "not yours"). A plan without
 * plugins gets no tools and a notice, never an error: the message is answered either way.
 */
@Injectable()
export class PluginResolveService {
  constructor(
    private readonly targets: InvokeTargetsRepository,
    private readonly planGate: RuntimePlanGateManager,
    private readonly settings: RuntimeSettingsManager,
    private readonly ownServers: OwnServerOffersManager,
  ) {}

  async resolve(body: InternalResolveBody): Promise<ResolveResponse> {
    const limits = await this.settings.loadLoopLimits();
    if (!(await this.planAllows(body.userId))) {
      return { tools: [], systemBlock: '', limits, notices: [{ code: RESOLVE_NOTICE_NO_TOOLS }] };
    }
    const tools: ResolvedTool[] = [];
    const lines: string[] = [];
    const unmatched = new Set<string>();
    for (const installId of new Set(body.refs.map((ref) => ref.installId))) {
      const install = await this.targets.findInstall(body.userId, installId);
      if (install === null) {
        // Not one of the caller's installs: it may be one of the caller's own MCP servers.
        unmatched.add(installId);
        continue;
      }
      const offered = this.offer(install, body.refs);
      if (offered === null) continue;
      tools.push(...offered.tools);
      lines.push(offered.line);
    }
    const own = await this.ownServers.offer(
      body.userId,
      body.refs
        .filter((ref) => unmatched.has(ref.installId))
        .map((ref) => ({ serverId: ref.installId, toolName: ref.toolName })),
    );
    tools.push(...own.tools);
    lines.push(...own.lines);
    const notices: ResolveNotice[] = [
      ...(tools.length === 0 ? [{ code: RESOLVE_NOTICE_NO_TOOLS }] : []),
      ...own.notices,
    ];
    return { tools, systemBlock: lines.join('\n'), limits, notices };
  }

  private async planAllows(userId: string): Promise<boolean> {
    try {
      await this.planGate.assertAllowed(userId);
      return true;
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }

  private offer(
    install: InstallTargetRecord,
    refs: readonly ResolveMention[],
  ): ResolvedOffer | null {
    const withdrawn =
      install.catalogStatus === CatalogStatus.DRAFT ||
      install.catalogStatus === CatalogStatus.HIDDEN;
    if (install.status !== InstallStatus.ENABLED || withdrawn || !install.globallyEnabled) {
      return null;
    }
    const parsed = parsePluginManifest(install.manifest);
    if (!parsed.ok) return null;
    const mine = refs.filter((ref) => ref.installId === install.installId);
    const wholePlugin = mine.some((ref) => ref.toolName === undefined);
    const picked = new Set(mine.map((ref) => ref.toolName));
    const tools = parsed.manifest.tools
      .filter((tool) => !install.disabledTools.includes(tool.name))
      .filter((tool) => wholePlugin || picked.has(tool.name))
      .map((tool) => this.toResolved(install, tool));
    return tools.length === 0 ? null : { tools, line: this.describe(parsed.manifest) };
  }

  private toResolved(
    install: InstallTargetRecord,
    tool: PluginManifest['tools'][number],
  ): ResolvedTool {
    return {
      nativeName: `${NATIVE_TOOL_PREFIX}_${install.slug}_${tool.name}`,
      installId: install.installId,
      pluginSlug: install.slug,
      toolName: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      riskLevel: tool.riskLevel,
    };
  }

  private describe(manifest: PluginManifest): string {
    return `- ${manifest.slug}: ${manifest.translations.en.summary.slice(0, RESOLVE_SYSTEM_BLOCK_DESCRIPTION_MAX)}`;
  }
}
