import type { CatalogSource } from '../../../common/enums/catalog-source.enum';
import type { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';

export type AdminToolRecord = { name: string; riskLevel: RiskLevel; disabledByAdmin: boolean };

export type AdminCatalogRecord = {
  id: string;
  slug: string;
  source: CatalogSource;
  status: CatalogStatus;
  category: string;
  publisher: string;
  iconKey: string;
  translations: unknown;
  globallyEnabled: boolean;
  featured: boolean;
  installCount: number;
  currentVersion: { id: string; version: string; tools: AdminToolRecord[] } | null;
};

export type AdminEntryChanges = { globallyEnabled?: boolean; featured?: boolean };

export type AdminToolChange = { name: string; disabledByAdmin: boolean };

export type PluginSettingRow = { key: string; value: unknown; updatedAt: Date };

export type PluginSettingRule = { kind: 'boolean' } | { kind: 'integer'; min: number; max: number };

export type SettingProblem = { field: string; message: string };
