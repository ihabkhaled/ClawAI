import type { ContextPackItemType } from '../../../generated/prisma';

export type PackExportPayload = {
  version: number;
  name: string;
  description: string | null;
  tags: string[];
  scope: string;
  visibility: string;
  items: Array<{
    itemType: ContextPackItemType;
    content: string | null;
    url: string | null;
    sortOrder: number;
    pinned: boolean;
    tokenCountEstimate: number;
  }>;
};

export type PackImportResult = {
  packId: string;
  insertedItems: number;
  skippedItems: number;
  errors: string[];
};
