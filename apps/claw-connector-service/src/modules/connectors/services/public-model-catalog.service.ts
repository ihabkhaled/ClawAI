import { Injectable } from '@nestjs/common';
import { type ConnectorProvider } from '../../../generated/prisma';
import {
  PUBLIC_PROVIDER_DISPLAY_NAMES,
  PUBLIC_PROVIDER_ORDER,
} from '../constants/public-model-catalog.constants';
import { ConnectorModelsRepository } from '../repositories/connector-models.repository';
import { formatModelDisplayName } from '../utilities/model-display-name.utility';
import type {
  PublicCatalogModel,
  PublicCatalogProvider,
  PublicModelCatalog,
} from '../types/public-model-catalog.types';

/**
 * The model catalog as the public marketing pages may state it.
 *
 * It answers one question honestly: **which models can somebody actually use
 * here?** So it reads through `findExposedForCatalog` — the very same query
 * that fills the in-app model picker — rather than a seed list, a static file,
 * or the full synced set. A public page listing a model no user can select is a
 * lie; one omitting a model users have is a missed sale. Sharing the predicate
 * is what keeps those two in step without anybody remembering to.
 *
 * This replaces two hand-maintained frontend constants that had drifted apart
 * from each other AND from the product: one listed 16 models with a manual
 * review date, the other listed model names that existed nowhere in the
 * codebase. Neither could be wrong in a way a test would catch.
 *
 * What it deliberately does not carry: any price or cost rate (rule 37 — a
 * provider rate must never appear in a non-admin response), and any connector
 * identity or health, which is this deployment's operational detail rather than
 * product information.
 */
@Injectable()
export class PublicModelCatalogService {
  constructor(private readonly connectorModels: ConnectorModelsRepository) {}

  async getCatalog(): Promise<PublicModelCatalog> {
    const rows = await this.connectorModels.findExposedForCatalog();

    const byProvider = new Map<ConnectorProvider, PublicCatalogModel[]>();
    for (const row of rows) {
      const models = byProvider.get(row.provider) ?? [];
      models.push({
        modelKey: row.modelKey,
        // Re-formatted on read, not just on write. Rows synced before the
        // formatter existed still hold names like "Models/gemini 2.5 Pro", and
        // a marketing page must not look broken until somebody re-syncs a
        // connector. The formatter is idempotent, so a clean name passes
        // through untouched.
        displayName: formatModelDisplayName(row.displayName),
        maxContextTokens: row.maxContextTokens,
        supportsStreaming: row.supportsStreaming,
        supportsTools: row.supportsTools,
        supportsVision: row.supportsVision,
        supportsAudio: row.supportsAudio,
        supportsStructuredOutput: row.supportsStructuredOutput,
        usageTier: row.usageTier,
      });
      byProvider.set(row.provider, models);
    }

    const providers = this.orderProviders([...byProvider.keys()]).map(
      (provider): PublicCatalogProvider => {
        const models = byProvider.get(provider) ?? [];
        return {
          provider,
          displayName: PUBLIC_PROVIDER_DISPLAY_NAMES[provider],
          modelCount: models.length,
          models,
        };
      },
    );

    return {
      providers,
      totalModelCount: rows.length,
      providerCount: providers.length,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fixed order first, then anything new.
   *
   * Sorting by model count instead would reshuffle the page every time an
   * administrator syncs a connector, which breaks anchor links and makes two
   * deploys of the same content look like different pages. A provider added to
   * the enum but not yet to the order list still appears, at the end, rather
   * than silently vanishing.
   */
  private orderProviders(present: ConnectorProvider[]): ConnectorProvider[] {
    const ranked = PUBLIC_PROVIDER_ORDER.filter((provider) => present.includes(provider));
    const unranked = present
      .filter((provider) => !PUBLIC_PROVIDER_ORDER.includes(provider))
      .sort((left, right) => left.localeCompare(right));
    return [...ranked, ...unranked];
  }
}
