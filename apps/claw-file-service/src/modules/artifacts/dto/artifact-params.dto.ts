import { z } from 'zod';
import { ARTIFACT_PUBLIC_ID_PATTERN } from '../constants/artifact.constants';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../../common/constants/pagination.constants';

export const artifactIdParamSchema = z.object({ id: z.string().min(1).max(64) });
export type ArtifactIdParamDto = z.infer<typeof artifactIdParamSchema>;

export const publicArtifactParamSchema = z.object({
  publicId: z.string().regex(ARTIFACT_PUBLIC_ID_PATTERN),
});
export type PublicArtifactParamDto = z.infer<typeof publicArtifactParamSchema>;

export const listArtifactsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListArtifactsQueryDto = z.infer<typeof listArtifactsQuerySchema>;
