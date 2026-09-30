import { z } from 'zod';

import {
  DEFAULT_LIST_LIMIT,
  MAX_BODY_LENGTH,
  MAX_LIST_LIMIT,
  MAX_SEARCH_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_TEMPLATE,
  MAX_TITLE_LENGTH,
} from '../constants/prompt-library.constants';

const tagSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.string().min(1).max(MAX_TAG_LENGTH));

const tagsSchema = z
  .array(tagSchema)
  .max(MAX_TAGS_PER_TEMPLATE)
  .transform((tags) => [...new Set(tags)]);

const titleSchema = z.string().trim().min(1).max(MAX_TITLE_LENGTH);
const bodySchema = z.string().min(1).max(MAX_BODY_LENGTH);

export const createPromptTemplateSchema = z.object({
  title: titleSchema,
  body: bodySchema,
  tags: tagsSchema.default([]),
  isFavorite: z.boolean().default(false),
});
export type CreatePromptTemplateDto = z.infer<typeof createPromptTemplateSchema>;

export const updatePromptTemplateSchema = z
  .object({
    title: titleSchema.optional(),
    body: bodySchema.optional(),
    tags: tagsSchema.optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });
export type UpdatePromptTemplateDto = z.infer<typeof updatePromptTemplateSchema>;

export const listPromptTemplatesQuerySchema = z.object({
  q: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
  tag: tagSchema.optional(),
  favorite: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).default(DEFAULT_LIST_LIMIT),
});
export type ListPromptTemplatesQueryDto = z.infer<typeof listPromptTemplatesQuerySchema>;

export const promptTemplateParamSchema = z.object({ id: z.string().uuid() });
export type PromptTemplateParamDto = z.infer<typeof promptTemplateParamSchema>;
