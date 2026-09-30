import { PWA_VERSION_ENDPOINT } from '@/constants/pwa.constants';
import type { DeployedVersionResponse } from '@/types/pwa.types';

export const appVersionRepository = {
  /** The version currently deployed, or null when the server cannot say. */
  async deployed(): Promise<string | null> {
    try {
      const response = await fetch(PWA_VERSION_ENDPOINT, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as Partial<DeployedVersionResponse>;
      return typeof body.version === 'string' ? body.version : null;
    } catch {
      return null;
    }
  },
};
