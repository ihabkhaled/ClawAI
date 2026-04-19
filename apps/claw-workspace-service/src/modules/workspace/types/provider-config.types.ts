import type {
  WorkspaceProvider,
  WorkspaceProviderAppConfig,
  WorkspaceProviderAppConfigStatus,
  WorkspaceProviderAuthMode,
} from '../../../generated/prisma';

export type ProviderAppConfigPublic = Omit<WorkspaceProviderAppConfig, 'encryptedSecret'> & {
  hasSecret: boolean;
};

export type CreateProviderAppConfigInput = {
  provider: WorkspaceProvider;
  name: string;
  description?: string;
  authMode: WorkspaceProviderAuthMode;
  publicConfig: Record<string, unknown>;
  secretConfig?: Record<string, unknown>;
  scopes?: string[];
};

export type UpdateProviderAppConfigInput = {
  name?: string;
  description?: string;
  authMode?: WorkspaceProviderAuthMode;
  publicConfig?: Record<string, unknown>;
  secretConfig?: Record<string, unknown>;
  scopes?: string[];
  status?: WorkspaceProviderAppConfigStatus;
};
