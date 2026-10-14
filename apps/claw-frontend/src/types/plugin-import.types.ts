import type { PluginImportComponentKind } from '@/enums/plugin-import-component-kind.enum';
import type { PluginImportPreviewKind } from '@/enums/plugin-import-preview-kind.enum';
import type { PluginImportRisk } from '@/enums/plugin-import-risk.enum';
import type { PluginImportSourceMode } from '@/enums/plugin-import-source-mode.enum';
import type { PluginImportSupport } from '@/enums/plugin-import-support.enum';

import type { PluginsTranslate } from './plugins.types';

export type PluginImportComponent = {
  kind: PluginImportComponentKind;
  name: string;
  path: string;
  description: string;
  support: PluginImportSupport;
  reasonKey?: string;
  url?: string;
};

export type PluginImportPreview = {
  format: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  components: PluginImportComponent[];
  risk: PluginImportRisk;
  warnings: string[];
  fileCount: number;
  keptFileCount: number;
  ignoredFileCount: number;
  totalBytes: number;
};

export type PluginImportSource = {
  kind: string;
  ref: string;
  commitSha: string | null;
};

export type PluginImportDraft = {
  draftId: string;
  checksum: string;
  source: PluginImportSource;
  preview: PluginImportPreview;
  expiresAt: string;
};

export type PluginImportCandidate = {
  name: string;
  description: string;
  subdir?: string;
  github?: string;
};

export type PluginImportPreviewResponse =
  | { kind: PluginImportPreviewKind.Plugin; draft: PluginImportDraft }
  | {
      kind: PluginImportPreviewKind.Marketplace;
      name: string;
      candidates: PluginImportCandidate[];
    };

export type ImportedPluginView = {
  id: string;
  name: string;
  version: string;
  description: string;
  source: PluginImportSource;
  checksum: string;
  preview: PluginImportPreview;
  totalBytes: number;
  fileCount: number;
  createdAt: string;
};

export type PluginImportForm = {
  mode: PluginImportSourceMode;
  source: string;
  subdir: string;
  file: File | undefined;
};

export type UsePluginImportPageReturn = {
  t: PluginsTranslate;
  form: PluginImportForm;
  setMode: (mode: PluginImportSourceMode) => void;
  setSource: (value: string) => void;
  setFile: (file: File | undefined) => void;
  canPreview: boolean;
  preview: () => void;
  isPreviewing: boolean;
  draft: PluginImportDraft | undefined;
  candidates: PluginImportCandidate[] | undefined;
  marketplaceName: string;
  chooseCandidate: (candidate: PluginImportCandidate) => void;
  acknowledged: boolean;
  setAcknowledged: (value: boolean) => void;
  canInstall: boolean;
  install: () => void;
  isInstalling: boolean;
  discard: () => void;
  errorMessage: string | null;
  imported: ImportedPluginView[];
  isLoadingImported: boolean;
  removingId: string | null;
  remove: (plugin: ImportedPluginView) => void;
};

export type PluginImportSourceFormProps = {
  form: PluginImportForm;
  setMode: (mode: PluginImportSourceMode) => void;
  setSource: (value: string) => void;
  setFile: (file: File | undefined) => void;
  canPreview: boolean;
  busy: boolean;
  onPreview: () => void;
  t: PluginsTranslate;
};

export type PluginImportReviewProps = {
  draft: PluginImportDraft;
  acknowledged: boolean;
  setAcknowledged: (value: boolean) => void;
  canInstall: boolean;
  busy: boolean;
  onInstall: () => void;
  onDiscard: () => void;
  t: PluginsTranslate;
};

export type PluginImportComponentRowProps = {
  component: PluginImportComponent;
  t: PluginsTranslate;
};

export type PluginImportMarketplaceListProps = {
  name: string;
  candidates: PluginImportCandidate[];
  onChoose: (candidate: PluginImportCandidate) => void;
  t: PluginsTranslate;
};

export type ImportedPluginCardProps = {
  plugin: ImportedPluginView;
  busy: boolean;
  onRemove: (plugin: ImportedPluginView) => void;
  t: PluginsTranslate;
};
