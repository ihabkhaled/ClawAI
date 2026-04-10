import type { MemoryFilterValue, MemoryType } from '@/enums';

import type { FormFieldErrors } from './component.types';

export type MemoryRecord = {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateMemoryRequest = {
  type: MemoryType;
  content: string;
  sourceThreadId?: string;
  sourceMessageId?: string;
};

export type UpdateMemoryRequest = {
  content?: string;
  type?: MemoryType;
  isEnabled?: boolean;
};

export type MemoryFilterType = MemoryType | MemoryFilterValue.ALL;

export type ToggleMemoryParams = {
  id: string;
};

export type UpdateMemoryParams = {
  id: string;
  data: UpdateMemoryRequest;
};

export type MemoryFormStateParams = {
  open: boolean;
  memory?: MemoryRecord | null;
  onSubmit: (data: CreateMemoryRequest) => void;
  onOpenChange: (open: boolean) => void;
};

export type MemoryFormStateReturn = {
  type: MemoryType | null;
  setType: (value: MemoryType) => void;
  content: string;
  setContent: (value: string) => void;
  fieldErrors: FormFieldErrors;
  isEditing: boolean;
  pendingLabel: string;
  submitLabel: string;
  handleSubmit: (e: React.FormEvent) => void;
  handleOpenChange: (nextOpen: boolean) => void;
};
