import { Injectable, Logger } from '@nestjs/common';
import { PreflightReason } from '../../../common/enums';
import { LlamacppEventsPublisher } from '../../../common/events/llamacpp-events.publisher';
import { type CatalogEntry } from '../../catalog/types/catalog.types';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type HardwareSnapshot, type PreflightResult } from '../types/hardware.types';
import { DISK_HEADROOM_FACTOR } from '../constants/hardware.constants';

@Injectable()
export class PreflightValidatorManager {
  private readonly logger = new Logger(PreflightValidatorManager.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: LlamacppEventsPublisher,
  ) {}

  validate(model: CatalogEntry, hardware: HardwareSnapshot, allowOverride: boolean): PreflightResult {
    this.logger.debug(`validate: model=${model.name}:${model.tag} override=${allowOverride}`);
    const reasons: PreflightReason[] = [];

    if (hardware.freeDiskGb < Math.ceil(model.requiredDiskGb * DISK_HEADROOM_FACTOR)) {
      reasons.push(PreflightReason.DISK_INSUFFICIENT);
    }
    if (hardware.totalRamGb > 0 && hardware.totalRamGb < model.requiredRamGb) {
      reasons.push(PreflightReason.RAM_INSUFFICIENT);
    }
    if (model.recommendedGpuVramGb > 0 && hardware.gpus.length === 0) {
      reasons.push(PreflightReason.GPU_INSUFFICIENT);
    }

    if (reasons.length === 0) {
      return { ok: true, reasons: [], overridable: false, overrideUsed: false, overriddenReasons: [] };
    }

    const overridable = reasons.every((r) => r !== PreflightReason.DISK_INSUFFICIENT);
    if (overridable && allowOverride) {
      this.logger.warn(`validate: override accepted for ${reasons.join(',')}`);
      return {
        ok: true,
        reasons: [],
        overridable: true,
        overrideUsed: true,
        overriddenReasons: reasons,
      };
    }
    return { ok: false, reasons, overridable, overrideUsed: false, overriddenReasons: [] };
  }

  async recordOverride(
    userId: string,
    model: CatalogEntry,
    hardware: HardwareSnapshot,
    reasons: PreflightReason[],
  ): Promise<void> {
    this.logger.log(`recordOverride: user=${userId} model=${model.name}:${model.tag} reasons=${reasons.join(',')}`);
    try {
      await this.prisma.preflightOverrideAudit.create({
        data: {
          userId,
          modelId: model.id,
          modelName: `${model.name}:${model.tag}`,
          reasons: reasons.map((reason) => String(reason)),
          hardwareSnapshot: JSON.parse(JSON.stringify(hardware)) as object,
        },
      });
      this.events.preflightOverridden({
        userId,
        modelId: model.id,
        modelName: `${model.name}:${model.tag}`,
        reasons,
      });
    } catch (error) {
      this.logger.error(`recordOverride: failed — ${(error as Error).message}`);
    }
  }
}
