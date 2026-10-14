import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../common/enums/install-status.enum';
import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { TargetKind } from '../../../common/enums/target-kind.enum';
import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { type InvokeBody } from '../dto/invoke.dto';
import { InvokeTargetsRepository } from '../repositories/invoke-targets.repository';
import { type ResolvedTarget } from '../types/invoke.types';
import { type InstallTargetRecord, type ServerTargetRecord } from '../types/target-record.types';

/**
 * Finds what a call is aimed at and says whether it can run right now. A target that is not the
 * caller's, or does not exist, or has no such tool, is a 404 (all three read the same). A target
 * that exists but is switched off, withdrawn, disabled by an admin or waiting for review is
 * returned with the reason, so the call can be refused as BLOCKED and audited.
 */
@Injectable()
export class InvokeTargetManager {
  private readonly logger = new Logger(InvokeTargetManager.name);

  constructor(private readonly repository: InvokeTargetsRepository) {}

  async resolve(userId: string, body: InvokeBody): Promise<ResolvedTarget> {
    if (body.installId !== undefined) {
      const install = await this.repository.findInstall(userId, body.installId);
      if (install !== null) return this.fromInstall(install, body.toolName);
      // chat-service carries a mentioned own server's id in the install id field: the same
      // owner-scoped lookup answers for it, and anything else still reads as "not found".
      const own = await this.repository.findServer(userId, body.installId, body.toolName);
      if (own === null) throw this.targetNotFound();
      return this.fromServer(own, body.toolName);
    }
    const server = await this.repository.findServer(userId, body.serverId ?? '', body.toolName);
    if (server === null) throw this.targetNotFound();
    return this.fromServer(server, body.toolName);
  }

  private fromInstall(record: InstallTargetRecord, toolName: string): ResolvedTarget {
    const parsed = parsePluginManifest(record.manifest);
    if (!parsed.ok) {
      this.logger.error(`fromInstall: stored manifest of ${record.slug} no longer parses`);
      throw this.targetNotFound();
    }
    const tool = parsed.manifest.tools.find((candidate) => candidate.name === toolName);
    if (tool === undefined) throw this.toolNotFound();
    const withdrawn =
      record.catalogStatus === CatalogStatus.DRAFT || record.catalogStatus === CatalogStatus.HIDDEN;
    const unavailable =
      record.status !== InstallStatus.ENABLED ||
      withdrawn ||
      !record.globallyEnabled ||
      record.disabledTools.includes(toolName);
    return {
      blocked: unavailable ? InvokeErrorCode.UNAVAILABLE : null,
      target: {
        kind: TargetKind.CATALOG,
        slug: record.slug,
        toolName,
        title: tool.title,
        riskLevel: tool.riskLevel,
        consentGranted:
          tool.riskLevel !== RiskLevel.DESTRUCTIVE &&
          record.consents.some(
            (consent) => consent.toolName === toolName && consent.level === tool.riskLevel,
          ),
        inputSchema: tool.inputSchema,
        timeoutMs: tool.timeoutMs,
        maxResultBytes: tool.maxResultBytes,
        installId: record.installId,
        pluginId: record.pluginId,
        serverId: null,
        runtimeKind: record.runtimeKind,
        manifest: parsed.manifest,
        settings: isPlainRecord(record.settings) ? record.settings : {},
        credential:
          record.credential === null
            ? null
            : {
                kind: record.credential.kind,
                headerName: record.credential.headerName ?? '',
                ciphertext: record.credential.ciphertext,
              },
      },
    };
  }

  private fromServer(record: ServerTargetRecord, toolName: string): ResolvedTarget {
    const tool = record.tool;
    if (tool === null) throw this.toolNotFound();
    const schema = isPlainRecord(tool.inputSchema) ? tool.inputSchema : null;
    return {
      blocked: this.serverBlock(record, tool.enabled && schema !== null),
      target: {
        kind: TargetKind.SERVER,
        slug: record.slug,
        toolName,
        title: tool.localName,
        riskLevel: tool.riskLevel,
        consentGranted: tool.riskLevel === RiskLevel.WRITE && tool.consentGranted,
        inputSchema: schema ?? {},
        timeoutMs: null,
        maxResultBytes: null,
        installId: null,
        pluginId: null,
        serverId: record.serverId,
        ownerUserId: record.ownerUserId,
        url: record.url,
        authKind: record.authKind,
        remoteName: tool.name,
        failureCount: record.failureCount,
        breakerOpenedAt: record.breakerOpenedAt,
      },
    };
  }

  private serverBlock(record: ServerTargetRecord, toolUsable: boolean): InvokeErrorCode | null {
    if (record.status === ServerState.NEEDS_REVIEW) return InvokeErrorCode.NEEDS_REVIEW;
    return record.status !== ServerState.APPROVED || !toolUsable
      ? InvokeErrorCode.UNAVAILABLE
      : null;
  }

  private targetNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Plugin or server not found',
      errorCode: InvokeErrorCode.TARGET_NOT_FOUND,
    });
  }

  private toolNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'That tool does not exist on this plugin or server',
      errorCode: InvokeErrorCode.TOOL_NOT_FOUND,
    });
  }
}
