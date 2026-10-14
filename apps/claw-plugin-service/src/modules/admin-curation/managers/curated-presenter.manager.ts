import { Injectable } from '@nestjs/common';
import { type CuratedEntryView, type CuratedLocaleText, Locale } from '@claw/shared-types';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { McpTransport } from '../../../common/enums/mcp-transport.enum';
import {
  type PluginManifest,
  type PluginManifestTranslations,
  pluginTranslationsSchema,
} from '../../catalog/schemas/plugin-manifest.schema';
import { localizeTranslations } from '../../catalog/utilities/localize-translations.utility';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { type CuratedRecord } from '../types/curation.types';

@Injectable()
export class CuratedPresenterManager {
  /** The admin row. Names are English; the stored per-locale text is returned whole for the edit form. */
  toView(record: CuratedRecord): CuratedEntryView {
    const translations = pluginTranslationsSchema.safeParse(record.translations);
    const server = this.serverOf(record);
    const auth = this.authOf(record);
    return {
      slug: record.slug,
      status: record.status,
      name: translations.success
        ? localizeTranslations(translations.data, Locale.EN).name
        : record.slug,
      publisher: record.publisher,
      category: record.category,
      iconKey: record.iconKey,
      homepageUrl: record.homepageUrl,
      url: server?.url ?? null,
      transport: server?.transport ?? null,
      authKind: auth?.kind ?? AuthKind.NONE,
      authHeaderName: auth !== null && 'headerName' in auth ? auth.headerName : null,
      globallyEnabled: record.globallyEnabled,
      featured: record.featured,
      deleted: record.deletedAt !== null,
      needsVerification: record.needsVerification,
      adminNotes: record.adminNotes,
      allowedPlanSlugs: record.allowedPlanSlugs,
      version: record.current?.version ?? null,
      installCount: record.installCount,
      tools: record.current?.tools ?? [],
      health: this.healthOf(record),
      translations: translations.success ? this.textsOf(translations.data) : {},
      source: record.source,
    };
  }

  private healthOf(record: CuratedRecord): CuratedEntryView['health'] {
    return {
      status: record.health.status,
      latencyMs: record.health.latencyMs,
      checkedAt: record.health.checkedAt?.toISOString() ?? null,
      errorCode: record.health.errorCode,
    };
  }

  private manifestOf(record: CuratedRecord): PluginManifest | null {
    const parsed = record.current === null ? null : parsePluginManifest(record.current.manifest);
    return parsed?.ok === true ? parsed.manifest : null;
  }

  private serverOf(record: CuratedRecord): { url: string; transport: McpTransport } | null {
    const runtime = this.manifestOf(record)?.runtime;
    return runtime?.kind === RuntimeKind.MCP_REMOTE ? runtime.server : null;
  }

  private authOf(record: CuratedRecord): PluginManifest['auth'] | null {
    return this.manifestOf(record)?.auth ?? null;
  }

  private textsOf(texts: PluginManifestTranslations): Record<string, CuratedLocaleText> {
    return Object.fromEntries(
      Object.entries(texts).filter(([, text]) => text !== undefined),
    ) as Record<string, CuratedLocaleText>;
  }
}
