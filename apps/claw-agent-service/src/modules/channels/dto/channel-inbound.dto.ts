import { z } from 'zod';
import { ChannelMessageKind } from '../enums/channel-message-kind.enum';

export const channelInboundSchema = z.object({
  kind: z.nativeEnum(ChannelMessageKind).default(ChannelMessageKind.WEBHOOK),
  source: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(8_000).default(''),
  url: z.string().url().max(2_048).optional(),
});

export type ChannelInboundDto = z.infer<typeof channelInboundSchema>;
