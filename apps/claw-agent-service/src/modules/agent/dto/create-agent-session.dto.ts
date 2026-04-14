import { z } from 'zod';

export const createAgentSessionSchema = z.object({
  hostname: z.string().min(1).max(255),
  platform: z.enum(['windows', 'linux', 'darwin']),
  agentVersion: z.string().min(1).max(50),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAgentSessionDto = z.infer<typeof createAgentSessionSchema>;
