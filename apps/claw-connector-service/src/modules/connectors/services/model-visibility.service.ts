import { Injectable, Logger } from '@nestjs/common';
import { MODEL_VISIBILITY_EVENT_LIMIT } from '../constants/model-visibility.constants';
import { RoutingVisibilityManager } from '../managers/routing-visibility.manager';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { ModelEventsRepository } from '../repositories/model-events.repository';
import { type ModelVisibilityReport, type ModelVisibilityRow } from '../types/connectors.types';
import { modelKeyVariants } from '../utilities/exposure-pair.utility';
import {
  connectorGateScore,
  connectorVisibilityGates,
  routingVisibilityGates,
  summarizeVisibility,
  visibilityProviderKey,
} from '../utilities/model-visibility.utility';

/**
 * "Why is model X not in the chat picker?" Walks every gate in order — the
 * connector-side filter of `GET /connectors/available-models`, then the
 * routing-side registry, router-only and price checks — and returns each with
 * PASS/FAIL and the reason, plus the model's recent sync trail. Plan access is
 * per user (auth-service) and not judged here.
 */
@Injectable()
export class ModelVisibilityService {
  private readonly logger = new Logger(ModelVisibilityService.name);

  constructor(
    private readonly connectorModelsRepository: ConnectorModelsRepository,
    private readonly modelEventsRepository: ModelEventsRepository,
    private readonly routingVisibility: RoutingVisibilityManager,
  ) {}

  async diagnose(provider: string, modelKey: string): Promise<ModelVisibilityReport> {
    const rows = await this.connectorModelsRepository.findForVisibility(
      provider,
      modelKeyVariants(modelKey),
    );
    const row = this.mostVisible(rows);
    const routing = await this.routingVisibility.fetch(
      row === null ? provider : visibilityProviderKey(row),
      row === null ? modelKey : row.modelKey,
    );
    const gates = [...connectorVisibilityGates(row), ...routingVisibilityGates(routing)];
    const recentEvents =
      row === null
        ? []
        : await this.modelEventsRepository.findRecent(
            rows.map((match) => match.connectorId),
            row.modelKey,
            MODEL_VISIBILITY_EVENT_LIMIT,
          );
    const summary = summarizeVisibility(gates);
    this.logger.log(
      `diagnose: ${provider}/${modelKey} visible=${String(summary.visibleInPicker)} firstFailing=${summary.firstFailingGate ?? 'none'}`,
    );
    return {
      provider,
      modelKey,
      ...summary,
      model:
        row === null
          ? null
          : {
              connectorId: row.connectorId,
              connectorName: row.connector.name,
              displayName: row.displayName,
              kind: row.kind,
              kindReason: row.kindReason,
              exposure: row.exposure,
              lifecycle: row.lifecycle,
            },
      gates,
      recentEvents,
    };
  }

  // A model can sit on several connectors; judge the one that gets furthest.
  private mostVisible(rows: ModelVisibilityRow[]): ModelVisibilityRow | null {
    let best: ModelVisibilityRow | null = null;
    let bestScore = -1;
    for (const row of rows) {
      const score = connectorGateScore(row);
      if (score > bestScore) {
        best = row;
        bestScore = score;
      }
    }
    return best;
  }
}
