import type { z } from 'zod';

import { platformFieldsSchema } from './create-research-platform.dto';

/**
 * Any editable field; the slug never changes. The combined shape (an
 * OFFICIAL_API row has an `apiKind`, a SITE_SEARCH row has a domain) is checked
 * by the service against the stored row merged with this patch.
 */
export const updateResearchPlatformSchema = platformFieldsSchema.partial().strict();

export type UpdateResearchPlatformDto = z.infer<typeof updateResearchPlatformSchema>;
