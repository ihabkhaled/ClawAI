import { z } from 'zod';

export const samlCallbackSchema = z.object({
  organizationSlug: z.string().min(1).max(60),
  SAMLResponse: z.string().min(1).max(1024 * 1024), // 1 MB cap
});

export type SamlCallbackDto = z.infer<typeof samlCallbackSchema>;

export const setOrgSsoMetadataSchema = z.object({
  expectedIssuer: z.string().min(1).max(500),
  acceptedFingerprintsSha256: z.array(z.string().regex(/^[0-9a-f]{64}$/)).max(10).optional(),
});

export type SetOrgSsoMetadataDto = z.infer<typeof setOrgSsoMetadataSchema>;
