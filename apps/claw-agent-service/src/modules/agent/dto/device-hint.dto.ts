import { z } from 'zod';

const OS_VALUES = ['darwin', 'linux', 'windows'] as const;

export const deviceHintSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  hostname: z.string().min(1).max(253),
  os: z.enum(OS_VALUES),
  platform: z.string().min(1).max(32),
  agentVersion: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[\w.\-+]+$/, 'agentVersion must be alphanumeric-dotted'),
});

export type DeviceHintDto = z.infer<typeof deviceHintSchema>;
