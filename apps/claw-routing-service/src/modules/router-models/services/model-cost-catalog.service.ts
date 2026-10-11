import { Injectable, Logger } from '@nestjs/common';
import { ModelPricingSource } from '../../../common/enums';
import { MODEL_COST_CATALOG_BATCH_SIZE } from '../constants/model-cost-catalog.constants';
import {
  LOCAL_COST_PROVIDERS,
  PRICE_COVERAGE_LOG_SAMPLE_SIZE,
} from '../constants/model-cost.constants';
import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { ModelCostService } from './model-cost.service';
import { toModelCostCatalogRow } from '../utilities/model-cost-catalog.utility';
import {
  type ModelCostCatalogRow,
  type RouterModelCatalogEntry,
  type UnpricedModelPage,
  type UnpricedModelRow,
} from '../types/model-cost-catalog.types';
import { fetchExposedConnectorModels } from '../utilities/connector-exposed-models.utility';
import {
  needsRealPrice,
  paginateUnpriced,
  toUnpricedRow,
} from '../utilities/unpriced-model-page.utility';

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

  /**
   * Exposed models with no real price of their own, paginated and searchable.
   *
   * Sources: every non-removed registry row, PLUS models the connector exposes
   * that have no registry row at all (custom-provider connectors never reach
   * the registry, so the Model Prices page cannot show them). Resolved through
   * the same `getSnapshot` the wallet uses. Local runtimes are excluded: they
   * are priced by compute configuration, not by a rate card.
   */
  async listUnpriced(page: number, pageSize: number, search?: string): Promise<UnpricedModelPage> {
    return paginateUnpriced(await this.collectUnpriced(), page, pageSize, search);
  }

  /**
   * Logs (and returns) how many exposed, credit-billed models still lack a real
   * price. Called after each registry sync so a coverage hole shows up in the
   * logs the day it appears, not when a user is refused.
   */
  async auditCoverage(): Promise<{ unpriced: number; fallback: number }> {
    const rows = await this.collectUnpriced();
    const unpriced = rows.filter((row) => row.pricingSource === ModelPricingSource.UNPRICED);
    const fallback = rows.length - unpriced.length;
    if (rows.length > 0) {
      const sample = rows
        .slice(0, PRICE_COVERAGE_LOG_SAMPLE_SIZE)
        .map((row) => `${row.provider}/${row.modelKey}`)
        .join(', ');
      this.logger.warn(
        `auditCoverage: ${String(unpriced.length)} exposed model(s) are UNPRICED (refused) and ${String(fallback)} are billed at a fallback estimate. First ${String(Math.min(rows.length, PRICE_COVERAGE_LOG_SAMPLE_SIZE))}: ${sample}`,
      );
    }
    return { unpriced: unpriced.length, fallback };
  }

  private async collectUnpriced(): Promise<UnpricedModelRow[]> {
    const catalog = await this.listCatalog();
    const known = new Set(catalog.map((row) => `${row.provider}:${row.modelKey}`));
    const result = catalog
      .filter((row) => needsRealPrice(row.pricingSource) && !this.isLocalProvider(row.provider))
      .map((row) => toUnpricedRow(row, true));
    const exposed = await fetchExposedConnectorModels();
    const gaps = exposed.filter((model) => !known.has(`${model.provider}:${model.modelKey}`));
    for (let start = 0; start < gaps.length; start += MODEL_COST_CATALOG_BATCH_SIZE) {
      const batch = gaps.slice(start, start + MODEL_COST_CATALOG_BATCH_SIZE);
      const rows = await Promise.all(
        batch.map((model) =>
          this.priceEntry({
            provider: model.provider,
            modelKey: model.modelKey,
            displayName: model.displayName,
          }),
        ),
      );
      for (const row of rows) {
        if (needsRealPrice(row.pricingSource)) {
          result.push(toUnpricedRow(row, false));
        }
      }
    }
    return result;
  }

  private isLocalProvider(provider: string): boolean {
    return LOCAL_COST_PROVIDERS.includes(provider.toUpperCase());
  }

  private async priceEntry(entry: RouterModelCatalogEntry): Promise<ModelCostCatalogRow> {
    const snapshot = await this.costs.getSnapshot(entry.provider, entry.modelKey);
    return toModelCostCatalogRow(entry, snapshot);
  }
}
