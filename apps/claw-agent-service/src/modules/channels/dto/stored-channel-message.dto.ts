import { z } from 'zod';
import { ChannelMessageKind } from '../enums/channel-message-kind.enum';

/** Re-validates what comes back out of Redis instead of trusting a cast. */
export const storedChannelMessageSchema = z.object({
  id: z.string().min(1),
  kind: z.nativeEnum(ChannelMessageKind),
  source: z.string(),
  title: z.string(),
  body: z.string(),
  url: z.string().nullable(),
  receivedAt: z.string(),
});
