import { type PromptTemplate } from '../../../generated/prisma';

export type PromptTemplateRecord = PromptTemplate;

export interface PromptTemplateView {
  id: string;
  title: string;
  body: string;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variables: string[];
}

export interface PromptTemplateListResult {
  items: PromptTemplateView[];
  nextCursor: string | null;
}

export interface CreatePromptTemplateInput {
  userId: string;
  title: string;
  body: string;
  tags: string[];
  isFavorite: boolean;
}

export interface UpdatePromptTemplateInput {
  title?: string;
  body?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export interface ListPromptTemplatesInput {
  userId: string;
  q?: string;
  tag?: string;
  favorite?: boolean;
  offset: number;
  limit: number;
}

export interface PromptTagCount {
  tag: string;
  count: number;
}

export interface PromptTagListResult {
  items: PromptTagCount[];
}
