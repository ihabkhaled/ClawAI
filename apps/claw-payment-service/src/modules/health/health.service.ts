import { Injectable, Logger } from '@nestjs/common';
import { PAYMENT_SERVICE } from '@claw/shared-constants';

import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { GatewayConfigService } from '../gateway-config/services/gateway-config.service';
import {
  HEALTH_STATUS_DEGRADED,
  HEALTH_STATUS_OK,
  HEALTH_STATUS_UNAVAILABLE,
} from './constants/health.constants';
import type { GatewayReadiness, HealthReport } from './types/health.types';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayConfig: GatewayConfigService,
  ) {}

  // Reports liveness plus which gateways are usable. A gateway that is only
  // partially configured reports `configured: false` — see AppConfig for why
  // half-configured is treated as off.
  async report(): Promise<HealthReport> {
    this.logger.debug('report: building health report');
    const database = await this.checkDatabase();
    const gateways = await this.describeGateways();
    return {
      status: database === HEALTH_STATUS_OK ? HEALTH_STATUS_OK : HEALTH_STATUS_DEGRADED,
      service: PAYMENT_SERVICE,
      database,
      gateways,
    };
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return HEALTH_STATUS_OK;
    } catch (error) {
      this.logger.error(
        `checkDatabase: payment database unreachable — ${(error as Error).message}`,
      );
      return HEALTH_STATUS_UNAVAILABLE;
    }
  }

  private async describeGateways(): Promise<GatewayReadiness[]> {
    const gateways = await this.gatewayConfig.listAdmin();
    return gateways.map((gateway) => ({
      gateway: gateway.gateway,
      configured: gateway.isEnabled && gateway.fields.every((field) => field.configured),
      mode: gateway.mode,
    }));
  }
}
