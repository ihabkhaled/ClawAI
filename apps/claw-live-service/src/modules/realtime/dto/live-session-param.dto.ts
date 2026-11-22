import { z } from 'zod';

/** A viewer session id in a route parameter (cuid alphabet, bounded). */
export const liveSessionIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/u);
