import type { PluginInstallView } from '@claw/shared-types';

/**
 * The install call succeeded and the key call after it failed. It carries the install so the
 * dialog can retry only the key call instead of installing a second time. The key is never
 * part of it.
 */
export class PluginCredentialSaveError extends Error {
  readonly install: PluginInstallView;

  constructor(install: PluginInstallView, cause: unknown) {
    super('Plugin installed but its API key was not saved', { cause });
    this.name = 'PluginCredentialSaveError';
    this.install = install;
  }
}
