import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  PLUGIN_CONSENT_PATH_PREFIX,
  PLUGIN_CONSENT_WAIT_HOP_MS,
} from '../constants/plugin-tools.constants';
import { PluginConsentState } from '../enums/plugin-consent-state.enum';
import type { PluginConsentWaitRequest } from '../types/plugin-consent.types';
import { PluginConsentPort } from './plugin-consent.port';

const waitResponseSchema = z.object({ status: z.nativeEnum(PluginConsentState) });

/** The HTTP adapter for {@link PluginConsentPort}: plugin-service's internal wait route. */
@Injectable()
export class PluginConsentClient extends PluginConsentPort {
  private readonly logger = new Logger(PluginConsentClient.name);

  async wait(request: PluginConsentWaitRequest): Promise<PluginConsentState> {
    const response = await httpRequest<unknown>({
      url: `${AppConfig.get().PLUGIN_SERVICE_URL}${PLUGIN_CONSENT_PATH_PREFIX}/${encodeURIComponent(request.requestId)}/wait`,
      method: HttpMethod.POST,
      headers: { Authorization: buildInterServiceAuthHeader() },
      body: { userId: request.userId, waitMs: request.waitMs },
      timeoutMs: request.waitMs + PLUGIN_CONSENT_WAIT_HOP_MS,
    });
    const parsed = waitResponseSchema.safeParse(response.data);
    if (!response.ok || !parsed.success) {
      this.logger.warn(`consent wait answered ${String(response.status)} without a usable status`);
      throw new Error('plugin consent wait failed');
    }
    return parsed.data.status;
  }
}
