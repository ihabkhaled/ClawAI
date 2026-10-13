import { Injectable, Logger } from '@nestjs/common';
import {
  type Locale,
  type PluginInstallView,
  type PluginMentionView,
  type PluginToolConsentView,
} from '@claw/shared-types';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { InstallState } from '../../../common/enums/install-state.enum';
import { InstallStatus } from '../../../common/enums/install-status.enum';
import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import { pluginTranslationsSchema } from '../../catalog/schemas/plugin-manifest.schema';
import { localizeTranslations } from '../../catalog/utilities/localize-translations.utility';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { type InstallRecord } from '../types/install.types';

@Injectable()
export class InstallPresenterManager {
  private readonly logger = new Logger(InstallPresenterManager.name);

  /** The state the user sees: UNAVAILABLE wins when the plugin was switched off for everyone. */
  stateOf(record: InstallRecord): InstallState {
    const available =
      record.plugin.status === CatalogStatus.PUBLISHED && record.plugin.globallyEnabled;
    if (!available) return InstallState.UNAVAILABLE;
    return record.status === InstallStatus.ENABLED ? InstallState.ENABLED : InstallState.DISABLED;
  }

  toView(record: InstallRecord, locale: Locale): PluginInstallView {
    return {
      id: record.id,
      slug: record.plugin.slug,
      name: this.nameOf(record, locale),
      iconKey: record.plugin.iconKey,
      version: record.version.version,
      latestVersion: record.plugin.latestVersion,
      state: this.stateOf(record),
      authKind: this.authKindOf(record),
      settings: this.settingsOf(record),
      credential: {
        hasCredential: record.credential !== null,
        kind: record.credential?.kind ?? null,
        updatedAt: record.credential?.updatedAt.toISOString() ?? null,
      },
      consents: record.consents.map((consent) => this.consentView(consent)),
      installedAt: record.installedAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  toMention(record: InstallRecord, locale: Locale): PluginMentionView {
    return {
      installId: record.id,
      slug: record.plugin.slug,
      name: this.nameOf(record, locale),
      iconKey: record.plugin.iconKey,
      enabled: this.stateOf(record) === InstallState.ENABLED,
    };
  }

  private consentView(consent: InstallRecord['consents'][number]): PluginToolConsentView {
    return {
      toolName: consent.toolName,
      level: consent.level,
      grantedAt: consent.grantedAt.toISOString(),
    };
  }

  private nameOf(record: InstallRecord, locale: Locale): string {
    const translations = pluginTranslationsSchema.safeParse(record.plugin.translations);
    return translations.success
      ? localizeTranslations(translations.data, locale).name
      : record.plugin.slug;
  }

  private authKindOf(record: InstallRecord): AuthKind {
    const parsed = parsePluginManifest(record.version.manifest);
    if (parsed.ok) return parsed.manifest.auth.kind;
    this.logger.error(`authKindOf: manifest of ${record.plugin.slug} is invalid`);
    return AuthKind.NONE;
  }

  private settingsOf(record: InstallRecord): Record<string, unknown> {
    return isPlainRecord(record.settings) ? record.settings : {};
  }
}
