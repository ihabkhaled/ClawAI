import type { ContextPackItemTypeV2, VersionDiffStatus } from '@/enums';

export type ContextPackVersion = {
  id: string;
  contextPackId: string;
  version: number;
  summary: string | null;
  changedBy: string;
  createdAt: string;
};

export type VersionedItemSnapshot = {
  id: string;
  itemType: ContextPackItemTypeV2;
  content: string | null;
  fileId: string | null;
  url: string | null;
  memoryRefId: string | null;
  sortOrder: number;
  isEnabled: boolean;
  pinned: boolean;
  tokenCountEstimate: number;
};

export type VersionDiffItem = {
  itemId: string;
  status: VersionDiffStatus;
  before: VersionedItemSnapshot | null;
  after: VersionedItemSnapshot | null;
};

export type VersionDiff = {
  fromVersion: number;
  toVersion: number;
  packMetadataChanged: boolean;
  items: VersionDiffItem[];
};

export type ContextPackTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isSystem: boolean;
  createdAt: string;
};

export type CloneTemplateRequest = {
  name?: string;
  description?: string;
};

export type ContextPackExportPayload = {
  version: number;
  name: string;
  description: string | null;
  tags: string[];
  scope: string;
  visibility: string;
  items: Array<{
    itemType: ContextPackItemTypeV2;
    content: string | null;
    url: string | null;
    sortOrder: number;
    pinned: boolean;
    tokenCountEstimate: number;
  }>;
};

export type ContextPackImportResult = {
  packId: string;
  insertedItems: number;
  skippedItems: number;
  errors: string[];
};

export type MemoryImportResult = {
  inserted: number;
  skipped: number;
  errors: Array<{ index: number; reason: string }>;
};
