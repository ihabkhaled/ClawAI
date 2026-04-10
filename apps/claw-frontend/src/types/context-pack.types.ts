import type { ContextPackItemType } from '@/enums';

import type { FormFieldErrors } from './component.types';

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
  type: ContextPackItemType;
  setType: (value: ContextPackItemType) => void;
  content: string;
  setContent: (value: string) => void;
  fileId: string;
  setFileId: (value: string) => void;
  fieldErrors: FormFieldErrors;
  isFileRef: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleOpenChange: (nextOpen: boolean) => void;
};
