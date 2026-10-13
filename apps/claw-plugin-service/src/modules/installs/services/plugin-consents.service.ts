import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type PluginToolConsentView } from '@claw/shared-types';

import { PluginErrorCode } from '../../../common/enums/plugin-error-code.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { rethrowInstallGone } from '../utilities/rethrow-install-gone.utility';
import { type ConsentBody } from '../dto/install.dto';
import { InstallSecretsRepository } from '../repositories/install-secrets.repository';
import { PluginInstallsService } from './plugin-installs.service';

/**
 * Stores the user's grant for one tool. READ tools never need one. WRITE asks on first use and the
 * grant is remembered; DESTRUCTIVE is stored too, but the runtime (batch 3) asks on every call.
 */
@Injectable()
export class PluginConsentsService {
  private readonly logger = new Logger(PluginConsentsService.name);

  constructor(
    private readonly installs: PluginInstallsService,
    private readonly secrets: InstallSecretsRepository,
  ) {}

  async grant(
    userId: string,
    installId: string,
    body: ConsentBody,
  ): Promise<PluginToolConsentView> {
    const install = await this.installs.requireOwned(installId, userId);
    const risk = this.riskOf(install.version.manifest, body.toolName);
    if (risk === RiskLevel.READ) {
      throw new BadRequestException({
        message: 'This tool only reads, so it needs no consent',
        errorCode: PluginErrorCode.CONSENT_NOT_REQUIRED,
      });
    }
    if (risk !== body.level) {
      throw new BadRequestException({
        message: 'The consent level does not match the tool risk',
        errorCode: PluginErrorCode.CONSENT_LEVEL_MISMATCH,
      });
    }
    const saved = await this.secrets
      .saveConsent(installId, body.toolName, body.level)
      .catch(rethrowInstallGone);
    this.logger.log(`grant: install=${installId} tool=${body.toolName} level=${body.level}`);
    return {
      toolName: saved.toolName,
      level: saved.level,
      grantedAt: saved.grantedAt.toISOString(),
    };
  }

  /** Removes the remembered grant. Idempotent: a tool with no grant is still a clean 204. */
  async revoke(userId: string, installId: string, toolName: string): Promise<void> {
    await this.installs.requireOwned(installId, userId);
    await this.secrets.deleteConsent(installId, toolName);
    this.logger.log(`revoke: install=${installId} tool=${toolName}`);
  }

  private riskOf(manifestJson: unknown, toolName: string): RiskLevel {
    const parsed = parsePluginManifest(manifestJson);
    const tool = parsed.ok
      ? parsed.manifest.tools.find((item) => item.name === toolName)
      : undefined;
    if (tool === undefined) {
      throw new NotFoundException({
        message: 'Tool not found in this plugin',
        errorCode: PluginErrorCode.TOOL_NOT_FOUND,
      });
    }
    return tool.riskLevel;
  }
}
