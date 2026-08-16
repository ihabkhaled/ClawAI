import { Injectable, Logger } from '@nestjs/common';
import type { GeminiRouterAdapter } from '../../adapters/gemini-router.adapter';
import type { LegacyLocalRouterAdapter } from '../../adapters/legacy-local-router.adapter';
import type { OllamaCloudRouterAdapter } from '../../adapters/ollama-cloud-router.adapter';
import { CloudRouterManager } from '../../managers/cloud-router.manager';
import { RouterInferenceCoordinatorManager } from '../../managers/router-inference-coordinator.manager';
import type { RouterAttemptRepository } from '../../repositories/router-attempt.repository';
import type { RouterConfigurationRepository } from '../../repositories/router-configuration.repository';
import type { RouterTraceService } from '../../services/router-trace.service';
import type { RoutingLabCase } from '../types/routing-lab-corpus.types';
import type { RoutingLabCaseOutcome, RoutingLabRunResult } from '../types/routing-lab-run.types';
import { resolveRoutingLabSnapshot } from '../utilities/routing-lab-configuration-variant.utility';
import { buildRoutingLabProviderAdapters } from '../utilities/routing-lab-fault-injector.utility';
import { mapCloudRouteResultToOutcome } from '../utilities/routing-lab-outcome-mapping.utility';

/**
 * Executes the routing lab corpus against real `CloudRouterManager` /
 * `RouterInferenceCoordinatorManager` instances.
 *
 * `CloudRouterManager`'s constructor takes the concrete, Prisma- and
 * RabbitMQ-backed classes rather than interfaces — each has private fields,
 * so TypeScript accepts a structurally-shaped fake for them only through an
 * `as unknown as` cast. This mirrors the pattern already established in
 * `cloud-router.manager.spec.ts`'s own `build()` helper: there is no
 * alternative that keeps a genuine `CloudRouterManager` instance without a
 * live database and message broker. The cast is confined to this one
 * construction boundary; nothing downstream of it is faked.
 */
@Injectable()
export class RoutingLabRunnerManager {
  private readonly logger = new Logger(RoutingLabRunnerManager.name);

  async runCase(labCase: RoutingLabCase): Promise<RoutingLabCaseOutcome> {
    const manager = this.buildManager(labCase);
    const result = await manager.route({
      traceId: labCase.id,
      prompt: labCase.prompt,
      eligibleDeploymentIds: labCase.eligibleDeploymentIds,
    });
    return mapCloudRouteResultToOutcome(labCase, result);
  }

  async runCorpus(cases: readonly RoutingLabCase[]): Promise<RoutingLabRunResult> {
    this.logger.log(`runCorpus: executing ${String(cases.length)} cases`);
    const outcomes: RoutingLabCaseOutcome[] = [];
    for (const labCase of cases) {
      outcomes.push(await this.runCase(labCase));
    }

    return {
      totalCases: cases.length,
      generatedAt: new Date().toISOString(),
      outcomes,
    };
  }

  private buildManager(labCase: RoutingLabCase): CloudRouterManager {
    const snapshot = resolveRoutingLabSnapshot(labCase.configurationVariant);
    const adapters = buildRoutingLabProviderAdapters(snapshot, labCase.faultPlan);

    const configurationRepository = {
      findPublishedSnapshot: () => Promise.resolve(snapshot),
    } as unknown as RouterConfigurationRepository;
    const attemptRepository = {
      recordAttempts: () => Promise.resolve(0),
    } as unknown as RouterAttemptRepository;
    const traceService = {
      emit: () => Promise.resolve(true),
    } as unknown as RouterTraceService;

    return new CloudRouterManager(
      configurationRepository,
      new RouterInferenceCoordinatorManager(),
      attemptRepository,
      traceService,
      adapters.gemini as unknown as GeminiRouterAdapter,
      adapters.ollamaCloud as unknown as OllamaCloudRouterAdapter,
      adapters.legacyLocal as unknown as LegacyLocalRouterAdapter,
    );
  }
}
