import { Injectable, Logger } from '@nestjs/common';
import { MODEL_COST_CATALOG_BATCH_SIZE } from '../constants/model-cost-catalog.constants';
import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { ModelCostService } from './model-cost.service';
import { toModelCostCatalogRow } from '../utilities/model-cost-catalog.utility';
import {
  type ModelCostCatalogRow,
  type RouterModelCatalogEntry,
} from '../types/model-cost-catalog.types';

/**
 * Answers "what does every model cost, and which are guesses" for the admin
 * surface.
 *
 * It owns NO resolution logic. Every rate comes back from
 * `ModelCostService.getSnapshot` — the same call the wallet makes — so the
 * table can never disagree with what a user is actually charged. A second
 * implementation here would drift the moment an alias rule changed.
 *
 * Separate from ModelCostService because that service is on the metering hot
 * path and has no business depending on the registry.
 */
@Injectable()
export class ModelCostCatalogService {
  private readonly logger = new Logger(ModelCostCatalogService.name);

  constructor(
    private readonly registry: RouterModelRegistryRepository,
    private readonly costs: ModelCostService,
  ) {}

  async listCatalog(): Promise<ModelCostCatalogRow[]> {
    const entries = await this.registry.listCatalogEntries();
    const rows: ModelCostCatalogRow[] = [];
    for (let start = 0; start < entries.length; start += MODEL_COST_CATALOG_BATCH_SIZE) {
      const batch = entries.slice(start, start + MODEL_COST_CATALOG_BATCH_SIZE);
      rows.push(...(await Promise.all(batch.map((entry) => this.priceEntry(entry)))));
    }
    if (rows.length === 0) {
      // An empty registry is an OPERATOR condition, not "this install has no
      // models" — it means discovery has never run. A production install sat
      // like this with a blank price page and every paid model refused, and
      // nothing anywhere said why. The admin page names the fix; this makes it
      // visible in the logs too.
      this.logger.warn(
        'listCatalog: the model registry is EMPTY, so no prices can be shown. ' +
          'Run model discovery (POST /routing/models/discovery/run) to import ' +
          'the models the configured connectors expose.',
      );
    }
    this.logger.debug(`listCatalog rows=${rows.length}`);
    return rows;
  }

  private async priceEntry(entry: RouterModelCatalogEntry): Promise<ModelCostCatalogRow> {
    const snapshot = await this.costs.getSnapshot(entry.provider, entry.modelKey);
    return toModelCostCatalogRow(entry, snapshot);
  }
}
