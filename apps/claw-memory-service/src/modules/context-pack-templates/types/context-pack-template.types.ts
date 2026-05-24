import type { ContextPackItemType } from '../../../generated/prisma';

export type TemplatePayloadItem = {
  itemType: ContextPackItemType;
  content: string;
  pinned: boolean;
};

export type TemplatePayload = {
  items: TemplatePayloadItem[];
};

export type CloneTemplateOptions = {
  name?: string;
  description?: string;
};
