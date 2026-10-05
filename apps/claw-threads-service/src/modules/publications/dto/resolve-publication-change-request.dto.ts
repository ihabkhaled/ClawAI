import { z } from 'zod';
import { editPublicationRevisionSchema } from './edit-publication-revision.dto';

const ownerResponseSchema = z.string().trim().max(2000).optional();

export const resolvePublicationChangeRequestSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('REJECTED'), ownerResponse: ownerResponseSchema }),
  z.object({
    status: z.literal('ACCEPTED'),
    ownerResponse: ownerResponseSchema,
    revision: editPublicationRevisionSchema,
  }),
]);

export type ResolvePublicationChangeRequestDto = z.infer<
  typeof resolvePublicationChangeRequestSchema
>;
