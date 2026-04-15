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

const canonicalPlatforms = ['windows'] as const;
const supportedPlatforms = [...nodePlatforms, ...canonicalPlatforms] as const;

function normalizePlatform(value: (typeof supportedPlatforms)[number]): string {
  if (value === 'win32' || value === 'cygwin') {
    return 'windows';
  }

  return value;
}

export const createAgentSessionSchema = z.object({
  hostname: z.string().min(1).max(255),
  platform: z.enum(supportedPlatforms).transform(normalizePlatform),
  agentVersion: z.string().min(1).max(50),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAgentSessionDto = z.infer<typeof createAgentSessionSchema>;
