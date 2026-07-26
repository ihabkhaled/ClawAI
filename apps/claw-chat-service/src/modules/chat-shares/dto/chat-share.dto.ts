import { z } from 'zod';

// What the owner is allowed to say.
//
// Note the absence of ownerUserId, publicShareId, visibility and safetyStatus.
// The identity comes from the JWT, the identifier is minted server-side, and
// visibility is GRANTED by the safety scan rather than requested — a caller
// that could set visibility directly could push an unscanned conversation
// straight into a search index.
export const publishShareSchema = z.object({
  allowIndexing: z.boolean(),
  // Unchecked by default and required to be true. A pre-ticked box would make
  // publishing somebody's private conversation a one-click accident.
  acknowledgedPublicWarning: z.literal(true),
});

export type PublishShareDto = z.infer<typeof publishShareSchema>;

export const updateShareSchema = z.object({
  allowIndexing: z.boolean(),
});

export type UpdateShareDto = z.infer<typeof updateShareSchema>;

export const threadParamSchema = z.object({
  threadId: z.string().min(1).max(64),
});

export type ThreadParamDto = z.infer<typeof threadParamSchema>;

// base64url of 16 bytes is exactly 22 characters. Validating the SHAPE before
// the database is touched means a hostile path segment never reaches a query
// and an enumeration sweep costs nothing to refuse.
export const publicShareParamSchema = z.object({
  publicShareId: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
});

export type PublicShareParamDto = z.infer<typeof publicShareParamSchema>;

export const sitemapFeedQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(5000).optional(),
  cursor: z.string().datetime().optional(),
});

export type SitemapFeedQueryDto = z.infer<typeof sitemapFeedQuerySchema>;
