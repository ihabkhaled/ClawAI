import { Injectable, Logger } from '@nestjs/common';

import { type RecordOutputLimitDto } from '../dto/record-output-limit.dto';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { isConnectorProvider } from '../utilities/connector-provider.utility';
import { modelKeyVariants } from '../utilities/exposure-pair.utility';

/**
 * Remembers an output ceiling a provider stated while refusing a request
 * (ADR-125), so the next request is clamped before it is sent instead of
 * failing first. chat-service reports it; the models-snapshot publishes the
 * smaller of this and the catalog's own value.
 *
 * A provider outside the connector enum (a local runtime tag) has no row and
 * is ignored rather than refused: this is a best-effort memory, never a gate.
 */
@Injectable()
export class ModelOutputLimitService {
  private readonly logger = new Logger(ModelOutputLimitService.name);

  constructor(private readonly connectorModelsRepository: ConnectorModelsRepository) {}

  async recordLearned(dto: RecordOutputLimitDto): Promise<{ updated: number }> {
    if (!isConnectorProvider(dto.provider)) {
      return { updated: 0 };
    }
    const updated = await this.connectorModelsRepository.lowerLearnedMaxOutputTokens(
      dto.provider,
      modelKeyVariants(dto.model),
      dto.maxOutputTokens,
    );
    if (updated > 0) {
      this.logger.log(
        `recordLearned: ${dto.provider}/${dto.model} output ceiling lowered to ${String(dto.maxOutputTokens)}`,
      );
    }
    return { updated };
  }
}
