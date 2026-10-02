import { Injectable, Logger } from '@nestjs/common';

import { type RecordModelUnavailableDto } from '../dto/record-model-unavailable.dto';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { isConnectorProvider } from '../utilities/connector-provider.utility';
import { modelKeyVariants } from '../utilities/exposure-pair.utility';

/**
 * Counts "the provider says this model does not exist" reports from
 * chat-service and retires a model that keeps being refused (ADR-151), so a
 * model a provider lists but no longer serves stops being offered to users.
 *
 * A provider outside the connector enum (a local runtime tag) has no row and
 * is ignored: this is best-effort memory, never a gate.
 */
@Injectable()
export class ModelUnavailableService {
  private readonly logger = new Logger(ModelUnavailableService.name);

  constructor(private readonly connectorModelsRepository: ConnectorModelsRepository) {}

  async record(dto: RecordModelUnavailableDto): Promise<{ counted: number; retired: number }> {
    if (!isConnectorProvider(dto.provider)) {
      return { counted: 0, retired: 0 };
    }
    const result = await this.connectorModelsRepository.recordUnavailable(
      dto.provider,
      modelKeyVariants(dto.model),
    );
    if (result.retired > 0) {
      this.logger.warn(
        `record: ${dto.provider}/${dto.model} retired after repeated model_not_found answers`,
      );
    }
    return result;
  }
}
