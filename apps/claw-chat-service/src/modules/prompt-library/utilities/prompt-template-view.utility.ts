import { type PromptTemplateRecord, type PromptTemplateView } from '../types/prompt-library.types';
import { extractTemplateVariables } from './template-variables.utility';

export function toView(record: PromptTemplateRecord): PromptTemplateView {
  return {
    id: record.id,
    title: record.title,
    body: record.body,
    tags: record.tags,
    isFavorite: record.isFavorite,
    usageCount: record.usageCount,
    lastUsedAt: record.lastUsedAt ? record.lastUsedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    variables: extractTemplateVariables(record.body),
  };
}

export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

/** An unreadable cursor restarts at the first page rather than erroring. */
export function decodeCursor(cursor: string | undefined): number {
  if (cursor === undefined) {
    return 0;
  }
  const parsed = Number.parseInt(Buffer.from(cursor, 'base64url').toString('utf8'), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}
