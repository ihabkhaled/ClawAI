import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { declaredHost, httpRequest } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { FEEDBACK_IDENTITY_TIMEOUT_MS } from '../constants/feedback-public.constants';
import { type UserIdentityResponse } from '../types/feedback.types';
import { cleanSingleLine } from '../utilities/feedback-text.utility';

/**
 * The author's full name, asked of auth-service over the inter-service route —
 * never read from another service's database. The access token carries only
 * id, email and role, so the name has to come from the profile owner.
 *
 * Best effort by design: a ticket is worth more without a name than not saved,
 * so any failure returns null and the ticket is stored with no snapshot.
 */
@Injectable()
export class UserIdentityClient {
  private readonly logger = new Logger(UserIdentityClient.name);

  async fullName(userId: string): Promise<string | null> {
    const config = AppConfig.get();
    const url = `${config.AUTH_SERVICE_URL}/api/v1/internal/users/${encodeURIComponent(userId)}/identity`;
    try {
      const response = await httpRequest<UserIdentityResponse>({
        url,
        method: HttpMethod.GET,
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        timeoutMs: FEEDBACK_IDENTITY_TIMEOUT_MS,
        allowedHosts: declaredHost(config.AUTH_SERVICE_URL),
      });
      if (!response.ok) {
        this.logger.warn(`identity lookup returned status ${String(response.status)}`);
        return null;
      }
      return joinName(response.data);
    } catch (error: unknown) {
      // Never logs the token, the user id or any profile data.
      this.logger.warn(
        `identity lookup failed — ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }
}

function joinName(identity: UserIdentityResponse): string | null {
  const parts = [identity.firstName, identity.lastName]
    .map((part) => (typeof part === 'string' ? cleanSingleLine(part) : ''))
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(' ') : null;
}
