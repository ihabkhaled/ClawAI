import { z } from 'zod';
import { CHANNEL_INBOX_MAX_PAGE } from '../constants/channel.constants';

export const channelInboxQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(CHANNEL_INBOX_MAX_PAGE).default(20),
});

export type ChannelInboxQueryDto = z.infer<typeof channelInboxQuerySchema>;
