import { z } from 'zod';
import {
  WorkspaceProvider,
  WorkspaceProviderAppConfigStatus,
  WorkspaceProviderAuthMode,
} from '../../../generated/prisma';

export const createProviderAppConfigSchema = z.object({
  provider: z.nativeEnum(WorkspaceProvider),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
  authMode: z.nativeEnum(WorkspaceProviderAuthMode),
  publicConfig: z.record(z.string(), z.unknown()).default({}),
  secretConfig: z.record(z.string(), z.unknown()).optional(),
  scopes: z.array(z.string().max(120)).max(64).optional(),
});
export type CreateProviderAppConfigDto = z.infer<typeof createProviderAppConfigSchema>;

export const updateProviderAppConfigSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  authMode: z.nativeEnum(WorkspaceProviderAuthMode).optional(),
  publicConfig: z.record(z.string(), z.unknown()).optional(),
  secretConfig: z.record(z.string(), z.unknown()).optional(),
  scopes: z.array(z.string().max(120)).max(64).optional(),
  status: z.nativeEnum(WorkspaceProviderAppConfigStatus).optional(),
});
export type UpdateProviderAppConfigDto = z.infer<typeof updateProviderAppConfigSchema>;

export const listProviderAppConfigsQuerySchema = z.object({
  provider: z.nativeEnum(WorkspaceProvider).optional(),
});
export type ListProviderAppConfigsQueryDto = z.infer<typeof listProviderAppConfigsQuerySchema>;
