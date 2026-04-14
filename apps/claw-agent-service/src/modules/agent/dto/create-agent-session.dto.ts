import { z } from 'zod';

const nodePlatforms = [
  'aix',
  'android',
  'darwin',
  'freebsd',
  'haiku',
  'linux',
  'openbsd',
  'sunos',
  'win32',
  'cygwin',
  'netbsd',
] as const satisfies readonly NodeJS.Platform[];

export const createAgentSessionSchema = z.object({
  hostname: z.string().min(1).max(255),
  platform: z.enum(nodePlatforms),
  agentVersion: z.string().min(1).max(50),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAgentSessionDto = z.infer<typeof createAgentSessionSchema>;
