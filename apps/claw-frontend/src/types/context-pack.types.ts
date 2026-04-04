import type { ContextPackItemType } from "@/enums";

export type ContextPack = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  scope: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContextPackItem = {
  id: string;
  contextPackId: string;
  type: ContextPackItemType;
  content: string | null;
  fileId: string | null;
  sortOrder: number;
  createdAt: string;
};

export type ContextPackWithItems = ContextPack & {
  items: ContextPackItem[];
};

export type CreateContextPackRequest = {
  name: string;
  description?: string;
  scope?: string;
};

export type UpdateContextPackRequest = {
  name?: string;
  description?: string;
  scope?: string;
};

export type CreateContextPackItemRequest = {
  type: ContextPackItemType;
  content?: string;
  fileId?: string;
  sortOrder?: number;
};

export type UpdateContextPackItemRequest = {
  type?: ContextPackItemType;
  content?: string;
  fileId?: string;
  sortOrder?: number;
};
