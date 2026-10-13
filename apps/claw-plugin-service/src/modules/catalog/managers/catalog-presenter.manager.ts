import { Injectable, Logger } from '@nestjs/common';
import { type Locale } from '@claw/shared-types';

import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { RISK_ORDER } from '../constants/catalog.constants';
import { pluginTranslationsSchema } from '../schemas/plugin-manifest.schema';
import {
  type CatalogCard,
  type CatalogDetail,
  type CatalogDetailTool,
  type CatalogEntryRecord,
} from '../types/catalog.types';
import { compareSemver } from '../utilities/compare-semver.utility';
import { localizeTranslations } from '../utilities/localize-translations.utility';
import { parsePluginManifest } from '../utilities/parse-plugin-manifest.utility';

@Injectable()
export class CatalogPresenterManager {
  private readonly logger = new Logger(CatalogPresenterManager.name);

  /** The card for the list view, or null when the stored row is corrupt. */
  toCard(entry: CatalogEntryRecord, locale: Locale, installed = false): CatalogCard | null {
    const translations = pluginTranslationsSchema.safeParse(entry.translations);
    if (!translations.success) {
      this.logger.error(`toCard: entry ${entry.slug} has invalid translations, skipping`);
      return null;
    }
    const enabledTools = entry.currentVersion.tools.filter((tool) => !tool.disabledByAdmin);
    const text = localizeTranslations(translations.data, locale);
    return {
      slug: entry.slug,
      name: text.name,
      summary: text.summary,
      publisher: entry.publisher,
      category: entry.category,
      iconKey: entry.iconKey,
      source: entry.source,
      version: entry.currentVersion.version,
      toolCount: enabledTools.length,
      maxRisk: this.maxRisk(enabledTools.map((tool) => tool.riskLevel)),
      installCount: entry.installCount,
      featured: entry.featured,
      installed,
    };
  }

  /** The detail page payload, or null when the stored row is corrupt. */
  toDetail(entry: CatalogEntryRecord, locale: Locale, installed = false): CatalogDetail | null {
    const card = this.toCard(entry, locale, installed);
    if (card === null) return null;
    const parsed = parsePluginManifest(entry.currentVersion.manifest);
    if (!parsed.ok) {
      this.logger.error(`toDetail: manifest of ${entry.slug} is invalid, hiding the entry`);
      return null;
    }
    const manifest = parsed.manifest;
    const disabled = new Set(
      entry.currentVersion.tools.filter((tool) => tool.disabledByAdmin).map((tool) => tool.name),
    );
    const tools: CatalogDetailTool[] = manifest.tools
      .filter((tool) => !disabled.has(tool.name))
      .map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        riskLevel: tool.riskLevel,
        scopes: tool.scopes,
        inputSchema: tool.inputSchema,
      }));
    const translations = pluginTranslationsSchema.parse(entry.translations);
    return {
      ...card,
      description: localizeTranslations(translations, locale).description,
      homepageUrl: entry.homepageUrl,
      auth: { kind: manifest.auth.kind, scopes: manifest.scopes },
      tools,
      settingsSchema: manifest.settingsSchema,
      network: { hosts: manifest.network.hosts, publicWeb: manifest.network.publicWeb },
      versions: [...entry.versions].sort((left, right) => compareSemver(right, left)),
    };
  }

  private maxRisk(levels: RiskLevel[]): RiskLevel {
    let highest = RiskLevel.READ;
    for (const level of levels) {
      if (RISK_ORDER.indexOf(level) > RISK_ORDER.indexOf(highest)) highest = level;
    }
    return highest;
  }
}
