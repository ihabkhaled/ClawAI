import type { ContextPackItem } from '../../../generated/prisma';

export type VersionedItemSnapshot = Pick<
  ContextPackItem,
  | 'id'
  | 'itemType'
  | 'content'
  | 'fileId'
  | 'url'
  | 'memoryRefId'
  | 'sortOrder'
  | 'isEnabled'
  | 'pinned'
  | 'tokenCountEstimate'
>;

export type VersionPayload = {
  name: string;
  description: string | null;
  tags: string[];
  items: VersionedItemSnapshot[];
};

export type VersionDiffItem = {
  itemId: string;
  status: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';
  before: VersionedItemSnapshot | null;
  after: VersionedItemSnapshot | null;
};

export type VersionDiff = {
  fromVersion: number;
  toVersion: number;
  packMetadataChanged: boolean;
  items: VersionDiffItem[];
};
