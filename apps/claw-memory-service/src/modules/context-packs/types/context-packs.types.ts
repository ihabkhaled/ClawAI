import type {
  ContextPack,
  ContextPackItem,
  ContextPackItemType,
  ContextPackScope,
  ContextPackVisibility,
} from '../../../generated/prisma';

export interface CreateContextPackData {
  userId: string;
  ownerUserId?: string;
  name: string;
  description?: string;
  // V2 additions
  scope?: ContextPackScope;
  scopeRef?: string;
  legacyScope?: string;
  tags?: string[];
  visibility?: ContextPackVisibility;
  color?: string;
  icon?: string;
  templateId?: string;
  pinned?: boolean;
}

export interface UpdateContextPackData {
  name?: string;
  description?: string;
  scope?: ContextPackScope;
  scopeRef?: string | null;
  tags?: string[];
  visibility?: ContextPackVisibility;
  isEnabled?: boolean;
  pausedUntil?: Date | null;
  pinned?: boolean;
  color?: string | null;
  icon?: string | null;
}

export interface AddContextPackItemData {
  contextPackId: string;
  itemType?: ContextPackItemType;
  legacyType?: string;
  content?: string;
  fileId?: string;
  url?: string;
  memoryRefId?: string;
  sortOrder?: number;
  isEnabled?: boolean;
  pinned?: boolean;
  tokenCountEstimate?: number;
}

export interface UpdateContextPackItemData {
  itemType?: ContextPackItemType;
  content?: string | null;
  fileId?: string | null;
  url?: string | null;
  memoryRefId?: string | null;
  sortOrder?: number;
  isEnabled?: boolean;
  pinned?: boolean;
  tokenCountEstimate?: number;
}

export interface ContextPackFilters {
  userId: string;
  search?: string;
  scope?: ContextPackScope;
  scopeRef?: string;
  visibility?: ContextPackVisibility;
  enabledOnly?: boolean;
}

export type ContextPackWithItems = ContextPack & {
  items: ContextPackItem[];
};
