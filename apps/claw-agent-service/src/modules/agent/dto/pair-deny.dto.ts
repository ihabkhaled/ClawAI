import { z } from 'zod';

const PAIRING_CODE_PATTERN = /^[\w-]{40,80}$/;

export const pairDenySchema = z.object({
  pairingCode: z.string().regex(PAIRING_CODE_PATTERN, 'Invalid pairing code format'),
});

export type PairDenyDto = z.infer<typeof pairDenySchema>;
