import type { Locale } from '@claw/shared-types';

import type { AuthKind } from '../../../common/enums/auth-kind.enum';
import type { CatalogSource } from '../../../common/enums/catalog-source.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';
import type { PluginManifestTranslations } from '../schemas/plugin-manifest.schema';

export type TranslationMap = PluginManifestTranslations;

export type LocalizedText = { name: string; summary: string; description: string };

/** English is complete; any other locale may carry only some of the fields. */
export type PartialTranslationMap = { en: LocalizedText } & Partial<
  Record<string, Partial<LocalizedText>>
>;

export type CatalogToolRecord = {
  name: string;
  riskLevel: RiskLevel;
  disabledByAdmin: boolean;
};

export type CatalogVersionRecord = {
  id: string;
  version: string;
  manifest: unknown;
  tools: CatalogToolRecord[];
};

export type CatalogEntryRecord = {
  id: string;
  slug: string;
  source: CatalogSource;
  category: string;
  publisher: string;
  iconKey: string;
  homepageUrl: string | null;
  translations: unknown;
  featured: boolean;
  installCount: number;
  currentVersion: CatalogVersionRecord;
  versions: string[];
};

export type CatalogCard = {
  slug: string;
  name: string;
  summary: string;
  publisher: string;
  category: string;
  iconKey: string;
  source: CatalogSource;
  version: string;
  toolCount: number;
  maxRisk: RiskLevel;
  installCount: number;
  featured: boolean;
  installed: boolean;
};

export type CatalogDetailTool = {
  name: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  scopes: string[];
  inputSchema: Record<string, unknown>;
};

export type CatalogDetail = CatalogCard & {
  description: string;
  homepageUrl: string | null;
  auth: { kind: AuthKind; scopes: Array<{ id: string; description: string }> };
  tools: CatalogDetailTool[];
  settingsSchema: Record<string, unknown>;
  network: { hosts: string[]; publicWeb: boolean };
  versions: string[];
};

export type CatalogPage = { items: CatalogCard[]; nextCursor: string | null };

export type CatalogLocaleInput = { locale: Locale | undefined; acceptLanguage: string | undefined };
