import type { PluginSettingKey } from '../../../common/enums/plugin-setting-key.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';
import type { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import type { PluginManifest } from '../../catalog/schemas/plugin-manifest.schema';

export type PluginSettingDefault = {
  key: PluginSettingKey;
  value: boolean | number;
};

export type SeedToolData = {
  name: string;
  riskLevel: RiskLevel;
  scopes: string[];
};

export type SeedEntryContent = {
  category: string;
  publisher: string;
  iconKey: string;
  homepageUrl: string | null;
  translations: unknown;
};

export type SeedVersionData = {
  version: string;
  runtimeKind: RuntimeKind;
  manifest: PluginManifest;
  manifestHash: string;
  tools: SeedToolData[];
};

export type ExistingSeedEntry = SeedEntryContent & {
  id: string;
  currentVersion: { id: string; version: string } | null;
};

export type ExistingSeedVersion = { id: string; manifestHash: string };

export type SeedSummary = {
  created: string[];
  updated: string[];
  unchanged: string[];
  skipped: string[];
  /** Slugs whose manifest changed under an already published version. */
  versionBumpRequired: string[];
};
