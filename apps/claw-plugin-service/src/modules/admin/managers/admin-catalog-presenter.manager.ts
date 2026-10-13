import { Injectable } from '@nestjs/common';
import { Locale, type PluginAdminCatalogEntryView } from '@claw/shared-types';

import { pluginTranslationsSchema } from '../../catalog/schemas/plugin-manifest.schema';
import { localizeTranslations } from '../../catalog/utilities/localize-translations.utility';
import { type AdminCatalogRecord } from '../types/admin.types';

@Injectable()
export class AdminCatalogPresenterManager {
  /** The admin row. Names are English: the console is not localized per plugin. */
  toView(record: AdminCatalogRecord): PluginAdminCatalogEntryView {
    const translations = pluginTranslationsSchema.safeParse(record.translations);
    return {
      slug: record.slug,
      name: translations.success
        ? localizeTranslations(translations.data, Locale.EN).name
        : record.slug,
      publisher: record.publisher,
      category: record.category,
      iconKey: record.iconKey,
      source: record.source,
      status: record.status,
      version: record.currentVersion?.version ?? null,
      globallyEnabled: record.globallyEnabled,
      featured: record.featured,
      installCount: record.installCount,
      tools: record.currentVersion?.tools ?? [],
    };
  }
}
