import { Injectable, Logger } from '@nestjs/common';
import { BillingGateway } from '@claw/shared-types';
import { PAYMENT_SERVICE } from '@claw/shared-constants';

import { AppConfig } from '../../app/config/app.config';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import {
  HEALTH_STATUS_DEGRADED,
  HEALTH_STATUS_OK,
  HEALTH_STATUS_UNAVAILABLE,
} from './constants/health.constants';
import { isPaymobConfigured, isPaypalConfigured } from './utilities/gateway-readiness.utility';
import type { GatewayReadiness, HealthReport } from './types/health.types';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Reports liveness plus which gateways are usable. A gateway that is only
  // partially configured reports `configured: false` — see AppConfig for why
  // half-configured is treated as off.
  async report(): Promise<HealthReport> {
    this.logger.debug('report: building health report');
    const database = await this.checkDatabase();
    const gateways = this.describeGateways();
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

  private describeGateways(): GatewayReadiness[] {
    const config = AppConfig.get();
    return [
      {
        gateway: BillingGateway.PAYPAL,
        configured: isPaypalConfigured(config),
        mode: config.PAYPAL_ENV,
      },
      {
        gateway: BillingGateway.PAYMOB,
        configured: isPaymobConfigured(config),
        mode: config.PAYMOB_CURRENCY,
      },
    ];
  }
}
