// V2 is what memory-service stores and returns
// (TEXT/FILE/URL/MARKDOWN/SNIPPET/MEMORY_REF). These types claimed the legacy
// V1 enum until 2026-08-30, which is what let a V2 value reach a V1-only label
// lookup and crash the pack page, and what let the picker offer three types the
// API rejects.
import type { ContextPackItemTypeV2 } from '@/enums';

import type { FormFieldErrors } from './component.types';
import type { UseSortableDragArgs, UseSortableDragReturn } from './drag-reorder.types';

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
  type: ContextPackItemTypeV2;
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
  type: ContextPackItemTypeV2;
  content?: string;
  fileId?: string;
  sortOrder?: number;
};

export type UpdateContextPackItemRequest = {
  type?: ContextPackItemTypeV2;
  content?: string;
  fileId?: string;
  sortOrder?: number;
};

export type ContextPackFormStateParams = {
  open: boolean;
  onSubmit: (data: CreateContextPackRequest) => void;
  onOpenChange: (open: boolean) => void;
};

export type ContextPackFormStateReturn = {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  scope: string;
  setScope: (value: string) => void;
  fieldErrors: FormFieldErrors;
  handleSubmit: (e: React.FormEvent) => void;
  handleOpenChange: (nextOpen: boolean) => void;
};

export type ContextPackItemFormStateParams = {
  open: boolean;
  onSubmit: (data: CreateContextPackItemRequest) => void;
  onOpenChange: (open: boolean) => void;
};

export type ContextPackItemFormStateReturn = {
  type: ContextPackItemTypeV2;
  setType: (value: ContextPackItemTypeV2) => void;
  content: string;
  setContent: (value: string) => void;
  fileId: string;
  setFileId: (value: string) => void;
  fieldErrors: FormFieldErrors;
  isFileRef: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleOpenChange: (nextOpen: boolean) => void;
};

// Aliases over the generic drag-reorder types (drag-reorder.types.ts) so
// every existing import of these two names keeps working unchanged — the
// underlying hook (use-context-pack-item-drag.ts) is now generic and reused
// verbatim by the smart-router admin's chain-entry reordering.
export type UseContextPackItemDragArgs = UseSortableDragArgs<ContextPackItem>;
export type UseContextPackItemDragReturn = UseSortableDragReturn;
