// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)

import { z } from 'zod';

export const detectLanguageSchema = z.object({
  message: z.string().min(0).max(200_000),
});

export type DetectLanguageDto = z.infer<typeof detectLanguageSchema>;
