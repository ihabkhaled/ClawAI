import { z } from 'zod';

export const PASS_SELECT = {
  id: true,
  revisionId: true,
  status: true,
  code: true,
  resultMarkdown: true,
} as const;

export const citationsSchema = z
  .array(z.object({ evidenceId: z.string().min(1), url: z.string().url() }))
  .catch([]);
