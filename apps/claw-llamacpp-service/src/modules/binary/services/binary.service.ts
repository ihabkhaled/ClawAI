import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { detectPlatform } from '../../../common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { LlamacppEventsPublisher } from '../../../common/events/llamacpp-events.publisher';
import { BinaryInstallerManager } from '../managers/binary-installer.manager';
import { BinaryReleaseRepository } from '../repositories/binary-release.repository';
import { type BinaryStatus, type RuntimeInfo } from '../types/binary.types';

@Injectable()
export class BinaryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BinaryService.name);
  private currentStatus: BinaryStatus = {
    installed: false,
    version: null,
    platform: null,
    path: null,
  };

  constructor(
    private readonly installer: BinaryInstallerManager,
    private readonly releaseRepo: BinaryReleaseRepository,
    private readonly events: LlamacppEventsPublisher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.debug('onApplicationBootstrap: hydrating binary state');
    await this.hydrateFromDb();
    if (!AppConfig.get().LLAMACPP_AUTO_INSTALL_BINARY) {
      this.logger.warn('onApplicationBootstrap: auto-install disabled by config');
      return;
    }
    void this.tryAutoInstall();
  }

  snapshot(): BinaryStatus {
    return { ...this.currentStatus };
  }

  async getRuntimeInfo(): Promise<RuntimeInfo> {
    const platform = await detectPlatform();
    const status = this.snapshot();
    return {
      binaryVersion: status.version,
      platform: platform.key,
      gpuBackend: platform.gpuBackend,
      binaryPath: status.path,
      capabilities: this.deriveCapabilities(platform.gpuBackend),
    };
  }

  async forceUpdate(): Promise<BinaryStatus> {
    this.logger.log('forceUpdate: re-running installer');
    const previousVersion = this.currentStatus.version;
    const result = await this.installer.ensureInstalled();
    if (result) {
      this.currentStatus = {
        installed: true,
        version: result.version,
        platform: result.platform,
        path: result.binaryPath,
      };
      if (previousVersion && previousVersion !== result.version) {
        this.events.binaryUpdated({
          version: result.version,
          previousVersion,
          platform: result.platform,
        });
      }
    }
    return this.snapshot();
  }

  private async hydrateFromDb(): Promise<void> {
    try {
      const platform = await detectPlatform();
      const existing = await this.releaseRepo.findActive(platform.key);
      if (existing) {
        this.currentStatus = {
          installed: true,
          version: existing.version,
          platform: existing.platform,
          path: existing.binaryPath,
        };
      }
    } catch (error) {
      this.logger.error(`hydrateFromDb: failed — ${(error as Error).message}`);
    }
  }

  private async tryAutoInstall(): Promise<void> {
    try {
      const wasInstalled = this.currentStatus.installed;
      const result = await this.installer.ensureInstalled();
      if (result) {
        this.currentStatus = {
          installed: true,
          version: result.version,
          platform: result.platform,
          path: result.binaryPath,
        };
        if (!wasInstalled) {
          this.events.binaryInstalled({
            version: result.version,
            platform: result.platform,
            binaryPath: result.binaryPath,
          });
        }
      }
    } catch (error) {
      this.logger.error(`tryAutoInstall: failed — ${(error as Error).message}`);
    }
  }

  private deriveCapabilities(gpuBackend: string): string[] {
    const caps = ['cpu'];
    const lower = gpuBackend.toLowerCase();
    if (lower.includes('cuda')) {
      caps.push('cuda');
    } else if (lower.includes('metal')) {
      caps.push('metal');
    } else if (lower.includes('vulkan')) {
      caps.push('vulkan');
    }
    return caps;
  }
}
