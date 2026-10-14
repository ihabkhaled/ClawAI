import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { declaredHost, httpRequest } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import {
  AUTH_PROFILE_BY_USERNAME_PATH,
  AUTH_PUBLIC_PROFILES_PATH,
  AUTHOR_IDENTITY_TIMEOUT_MS,
} from '../constants/author-identity.constants';
import type { AuthorProfile } from '../types/author-identity.types';

const profileSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
});
const profilesSchema = z.array(profileSchema);

/**
 * Asks auth-service (inter-service route, service token) who these people are. Names are never read
 * from another database. Best effort by design: any failure returns an empty answer, because a page
 * without names is worth more than a page that errors. Never logs the token, ids or names.
 */
@Injectable()
export class AuthProfileClient {
  private readonly logger = new Logger(AuthProfileClient.name);

  async fetchProfiles(ids: readonly string[]): Promise<AuthorProfile[]> {
    if (ids.length === 0) return [];
    const config = AppConfig.get();
    try {
      const response = await httpRequest<unknown>({
        url: `${config.AUTH_SERVICE_URL}${AUTH_PUBLIC_PROFILES_PATH}`,
        method: HttpMethod.POST,
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        body: { ids: [...ids] },
        timeoutMs: AUTHOR_IDENTITY_TIMEOUT_MS,
        allowedHosts: declaredHost(config.AUTH_SERVICE_URL),
      });
      if (!response.ok) {
        this.logger.warn(`public profile lookup returned status ${String(response.status)}`);
        return [];
      }
      const parsed = profilesSchema.safeParse(response.data);
      return parsed.success ? parsed.data : [];
    } catch (error: unknown) {
      this.logger.warn(`public profile lookup failed - ${errorMessage(error)}`);
      return [];
    }
  }

  /** null for an unknown or inactive username and for any failure. */
  async fetchByUsername(username: string): Promise<AuthorProfile | null> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<unknown>({
        url: `${config.AUTH_SERVICE_URL}${AUTH_PROFILE_BY_USERNAME_PATH}/${encodeURIComponent(username)}`,
        method: HttpMethod.GET,
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        timeoutMs: AUTHOR_IDENTITY_TIMEOUT_MS,
        allowedHosts: declaredHost(config.AUTH_SERVICE_URL),
      });
      if (!response.ok) {
        if (response.status !== 404) {
          this.logger.warn(`username lookup returned status ${String(response.status)}`);
        }
        return null;
      }
      const parsed = profileSchema.safeParse(response.data);
      return parsed.success ? parsed.data : null;
    } catch (error: unknown) {
      this.logger.warn(`username lookup failed - ${errorMessage(error)}`);
      return null;
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
