import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { toInputJson } from '../../../common/utilities/prisma-json.utility';
import {
  FETCH_STRATEGY_DEFAULT_ENABLED,
  FETCH_STRATEGY_DEFAULT_TIER,
  FETCH_STRATEGY_DEFAULT_TIMEOUT_MS,
  SIDECAR_DEFAULT_BASE_URL,
} from '../constants/fetch-strategy.constants';
import { FetchStrategyConfigRepository } from '../repositories/fetch-strategy-config.repository';
import { FetchStrategyKind } from '../../../generated/prisma';

/**
 * Idempotent seeder: every `FetchStrategyKind` gets exactly one
 * `FetchStrategyConfig` row at its default tier, enablement, timeout and base
 * URL — and a row that already exists is never touched, so an admin's
 * choice survives every reboot and every deploy.
 */
@Injectable()
export class FetchStrategyBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(FetchStrategyBootstrapService.name);

  constructor(private readonly configs: FetchStrategyConfigRepository) {}

  async onModuleInit(): Promise<void> {
    for (const kind of Object.values(FetchStrategyKind)) {
      await this.ensureSeeded(kind);
    }
  }

  private async ensureSeeded(kind: FetchStrategyKind): Promise<void> {
    const existing = await this.configs.findByKind(kind);
    if (existing !== null) {
      return;
    }
    const baseUrl = SIDECAR_DEFAULT_BASE_URL[kind];
    await this.configs.create({
      kind,
      enabled: FETCH_STRATEGY_DEFAULT_ENABLED[kind],
      tier: FETCH_STRATEGY_DEFAULT_TIER[kind],
      timeoutMs: FETCH_STRATEGY_DEFAULT_TIMEOUT_MS[kind],
      publicConfig: toInputJson(baseUrl === undefined ? {} : { baseUrl }),
    });
    this.logger.log(
      `Seeded fetch strategy ${kind} (enabled=${String(FETCH_STRATEGY_DEFAULT_ENABLED[kind])})`,
    );
  }
}
