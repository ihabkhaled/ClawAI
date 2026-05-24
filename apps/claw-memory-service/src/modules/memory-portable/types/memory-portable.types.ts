import type { MemoryType } from '../../../generated/prisma';

export type ImportRow = {
  type: MemoryType | string;
  content: string;
  scope?: string;
  scopeRef?: string;
  category?: string;
  tags?: string[];
  pinned?: boolean;
};

export type ImportResult = {
  inserted: number;
  skipped: number;
  errors: Array<{ index: number; reason: string }>;
};
