import { WorkspaceProviderAuthMode } from '@/enums/workspace-provider-auth-mode.enum';
import type { ProviderAppConfigFormValues } from '@/types';

/**
 * Set of provider keys that have a real backend adapter implementation.
 * Those NOT in this set are registered in the Provider Registry (so the
 * UI can show them) but attempting to use them for sync/write raises
 * `ADAPTER_NOT_IMPLEMENTED` (501) from the backend.
 *
 * Keep in sync with `NOT_IMPLEMENTED_PROVIDERS` in
 * `apps/claw-workspace-service/src/modules/workspace/adapters/workspace-adapter.factory.ts`.
 */
export const IMPLEMENTED_WORKSPACE_ADAPTERS: ReadonlySet<string> = new Set([
  'GITHUB',
  'SLACK',
  'JIRA',
  'GOOGLE_DRIVE',
]);

export const EMPTY_APP_CONFIG_FORM: ProviderAppConfigFormValues = {
  provider: '',
  name: '',
  description: '',
  authMode: WorkspaceProviderAuthMode.OAUTH2,
  publicConfig: {},
  secretConfig: {},
};
