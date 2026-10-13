import { z } from 'zod';
import { PublicationReportResolution } from '../../../common/enums/publication-report-resolution.enum';

export const moderatePublicationReportSchema = z.object({
  status: z.nativeEnum(PublicationReportResolution),
  hideComment: z.boolean().optional(),
  /** Publication-level reports only: also revoke the publication. */
  revokePublication: z.boolean().optional(),
});

export type ModeratePublicationReportDto = z.infer<typeof moderatePublicationReportSchema>;
