import { z } from 'zod';
import {
  EXTRACT_TEXT_MAX_BASE64_LENGTH,
  EXTRACT_TEXT_MAX_PAGE,
  EXTRACT_TEXT_MAX_PAGE_SPAN,
} from '../constants/extract-text.constants';

/**
 * Extract text from bytes without keeping them.
 *
 * Deliberately not an upload. The coding agent reads a PDF that is already in
 * the user's workspace, and an upload would put a copy of a repository file in
 * their file list and their storage, which is not what "read this file" means.
 * Nothing here is persisted: the bytes are parsed and dropped.
 */
export const extractTextSchema = z
  .object({
    filename: z.string().min(1).max(255),
    contentBase64: z.string().min(1).max(EXTRACT_TEXT_MAX_BASE64_LENGTH),
    /**
     * Inclusive, 1-based, both ends required.
     *
     * Omitted means the whole document. An open-ended range would make the
     * cheap case and the expensive case look identical at the call site.
     */
    pages: z
      .object({
        from: z.number().int().min(1).max(EXTRACT_TEXT_MAX_PAGE),
        to: z.number().int().min(1).max(EXTRACT_TEXT_MAX_PAGE),
      })
      .refine(
        (range) => Math.abs(range.to - range.from) + 1 <= EXTRACT_TEXT_MAX_PAGE_SPAN,
        `A range may cover at most ${String(EXTRACT_TEXT_MAX_PAGE_SPAN)} pages`,
      )
      .optional(),
  })
  .strict();

export type ExtractTextDto = z.infer<typeof extractTextSchema>;
