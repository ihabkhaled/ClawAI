import { Injectable } from '@nestjs/common';
import type { BillingGateway } from '@claw/shared-types';
import { Prisma } from '../../../generated/prisma';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { GATEWAY_CONFIG_SEED_LOCK_ID } from '../constants/gateway-config.constants';
import type {
  GatewayBootstrapInput,
  GatewayBootstrapOutcome,
  GatewayConfigurationRecord,
  GatewayConfigurationWrite,
} from '../types/gateway-config.types';

@Injectable()
export class GatewayConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<GatewayConfigurationRecord[]> {
    return this.prisma.gatewayConfiguration.findMany({ orderBy: { gateway: 'asc' } });
  }

  findEnabled(): Promise<GatewayConfigurationRecord[]> {
    return this.prisma.gatewayConfiguration.findMany({
      where: { isEnabled: true },
      orderBy: { gateway: 'asc' },
    });
  }

  findByGateway(gateway: BillingGateway): Promise<GatewayConfigurationRecord | null> {
    return this.prisma.gatewayConfiguration.findUnique({ where: { gateway } });
  }

  upsert(
    gateway: BillingGateway,
    data: GatewayConfigurationWrite,
  ): Promise<GatewayConfigurationRecord> {
    return this.prisma.gatewayConfiguration.upsert({
      where: { gateway },
      create: { gateway, ...data },
      update: data,
    });
  }

  importEnvironmentOnce(input: GatewayBootstrapInput): Promise<GatewayBootstrapOutcome> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(${GATEWAY_CONFIG_SEED_LOCK_ID})`,
      );
      const execution = await transaction.seedExecution.findUnique({
        where: { name_version: { name: input.name, version: input.version } },
      });
      if (execution?.status === 'COMPLETED') {
        return execution.checksum === input.checksum ? 'ALREADY_APPLIED' : 'CHECKSUM_MISMATCH';
      }
      await transaction.seedExecution.upsert({
        where: { name_version: { name: input.name, version: input.version } },
        create: {
          name: input.name,
          version: input.version,
          checksum: input.checksum,
          status: 'RUNNING',
        },
        update: { checksum: input.checksum, status: 'RUNNING', error: null },
      });
      for (const configuration of input.configurations) {
        const { gateway, ...data } = configuration;
        await transaction.gatewayConfiguration.upsert({
          where: { gateway },
          create: { gateway, ...data },
          update: {},
        });
      }
      await transaction.seedExecution.update({
        where: { name_version: { name: input.name, version: input.version } },
        data: { status: 'COMPLETED', completedAt: new Date(), error: null },
      });
      return 'APPLIED';
    });
  }
}
