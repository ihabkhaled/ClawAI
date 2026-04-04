import { type ContextPack, type ContextPackItem } from "../../../generated/prisma";

export interface CreateContextPackInput {
  userId: string;
  name: string;
  description?: string;
  scope?: string;
}

export interface UpdateContextPackInput {
  name?: string;
  description?: string;
  scope?: string;
}

export interface CreateContextPackItemInput {
  contextPackId: string;
  type: string;
  content?: string;
  fileId?: string;
  sortOrder?: number;
}

export interface UpdateContextPackItemInput {
  type?: string;
  content?: string;
  fileId?: string;
  sortOrder?: number;
}

export type ContextPackWithItems = ContextPack & {
  items: ContextPackItem[];
};
