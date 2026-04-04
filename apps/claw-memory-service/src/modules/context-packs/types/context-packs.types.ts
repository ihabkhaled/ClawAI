import { type ContextPack, type ContextPackItem } from "../../../generated/prisma";

export interface CreateContextPackData {
  userId: string;
  name: string;
  description?: string;
  scope?: string;
}

export interface UpdateContextPackData {
  name?: string;
  description?: string;
  scope?: string;
}

export interface AddContextPackItemData {
  contextPackId: string;
  type: string;
  content?: string;
  fileId?: string;
  sortOrder?: number;
}

export interface ContextPackFilters {
  userId: string;
  search?: string;
}

export type ContextPackWithItems = ContextPack & {
  items: ContextPackItem[];
};
