import type { PluginInstallView } from '@claw/shared-types';

import { pluginInstallsRepository } from '@/repositories/plugins/plugin-installs.repository';
import type { InstallPluginInput } from '@/types/plugin-installs.types';

import { PluginCredentialSaveError } from './plugin-credential-save-error';

/**
 * Installs, then stores the key when one was typed. Two calls, because the credential
 * endpoint belongs to an install that does not exist yet. If the key call fails the install
 * stays (the caller refreshes the list) and a PluginCredentialSaveError carries the install, so
 * the dialog retries only the key call.
 */
export async function installPluginWithCredential(
  input: InstallPluginInput,
): Promise<PluginInstallView> {
  const install = await pluginInstallsRepository.install(input.request);
  if (input.credential.length > 0) {
    try {
      await pluginInstallsRepository.putCredential(install.id, {
        kind: 'API_KEY',
        value: input.credential,
      });
    } catch (error) {
      throw new PluginCredentialSaveError(install, error);
    }
  }
  return install;
}
