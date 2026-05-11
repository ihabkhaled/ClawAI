import { Injectable, Logger } from '@nestjs/common';
import { RoutingMode } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ObservabilityFilter, type ObservabilitySummary } from '../types/observability.types';
import { countBy, meanOf, shareWhere } from '../utilities/count-by.utility';

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async summary(filter: ObservabilityFilter): Promise<ObservabilitySummary> {
    this.logger.debug(`summary from=${filter.from.toISOString()} to=${filter.to.toISOString()}`);
    const rows = await this.prisma.routingDecision.findMany({
      where: { createdAt: { gte: filter.from, lte: filter.to } },
      select: {
        selectedProvider: true,
        selectedModel: true,
        routingMode: true,
        detectedCategory: true,
        confidence: true,
      },
    });

    const totalRoutes = rows.length;
    const routesByProvider = countBy(rows, (r) => r.selectedProvider);
    const routesByModel = countBy(rows, (r) => r.selectedModel);
    const routesByMode = countBy(rows, (r) => r.routingMode);
    const routesByDomain = countBy(rows, (r) => r.detectedCategory);
    const averageConfidence = meanOf(rows, (r) =>
      r.confidence === null ? null : Number(r.confidence.toString()),
    );
    const manualOverrideRate = shareWhere(rows, (r) => r.routingMode === RoutingMode.MANUAL_MODEL);

    const noExecutionModelCount = await this.prisma.routingOutcomeRecord.count({
      where: {
        executionStatus: 'NO_EXECUTION_MODEL',
        createdAt: { gte: filter.from, lte: filter.to },
      },
    });

    return {
      windowStart: filter.from,
      windowEnd: filter.to,
      totalRoutes,
      routesByProvider,
      routesByModel,
      routesByMode,
      routesByDomain,
      averageConfidence,
      manualOverrideRate,
      noExecutionModelCount,
    };
  }
}
