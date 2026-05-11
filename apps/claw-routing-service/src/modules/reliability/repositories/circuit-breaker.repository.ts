import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerState } from '../../../common/enums';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CircuitBreakerRecord } from '../types/reliability.types';

@Injectable()
export class CircuitBreakerRepository {
  private readonly logger = new Logger(CircuitBreakerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByScope(scope: string): Promise<CircuitBreakerRecord | null> {
    const row = await this.prisma.routerCircuitBreaker.findUnique({ where: { scope } });
    return row === null ? null : this.toRecord(row);
  }

  async listAll(): Promise<CircuitBreakerRecord[]> {
    const rows = await this.prisma.routerCircuitBreaker.findMany({
      orderBy: { scope: 'asc' },
    });
    return rows.map((r) => this.toRecord(r));
  }

  async upsert(
    scope: string,
    state: CircuitBreakerState,
    failureCount: number,
    openedAt: Date | null,
  ): Promise<CircuitBreakerRecord> {
    this.logger.log(`upsert scope=${scope} state=${state} failures=${failureCount}`);
    const row = await this.prisma.routerCircuitBreaker.upsert({
      where: { scope },
      create: {
        scope,
        state,
        failureCount,
        openedAt,
        lastTransitionAt: new Date(),
      },
      update: {
        state,
        failureCount,
        openedAt,
        lastTransitionAt: new Date(),
      },
    });
    return this.toRecord(row);
  }

  private toRecord(row: {
    id: string;
    scope: string;
    state: string;
    failureCount: number;
    openedAt: Date | null;
    lastTransitionAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): CircuitBreakerRecord {
    return {
      id: row.id,
      scope: row.scope,
      state: row.state as CircuitBreakerState,
      failureCount: row.failureCount,
      openedAt: row.openedAt,
      lastTransitionAt: row.lastTransitionAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
