import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import {
  MODEL_EXPOSURE_CACHE_TTL_MS,
  MODEL_EXPOSURE_TIMEOUT_MS,
  MODEL_EXPOSURE_VALIDATION_PATH,
} from '../constants/model-exposure.constants';

const validateExposedResponseSchema = z.object({
  valid: z.array(z.object({ provider: z.string(), model: z.string() })),
});

@Injectable()
export class ModelExposureClient {
  private readonly logger = new Logger(ModelExposureClient.name);
  private readonly cache = new Map<string, { exposed: boolean; expiresAt: number }>();

  // Whether this exact deployment is currently offerable to users.
  //
  // The plan check answers "is this model on the user's plan"; it cannot
  // answer "is this model something ClawAI still offers at all", because plan
  // rows are just strings and an administrator can unexpose a model long
  // after a plan was configured. A crafted request naming an unexposed model
  // reaches execution otherwise.
  //
  // Fails CLOSED. If connector-service cannot answer, the model is treated as
  // not exposed: refusing one message is recoverable, executing an unexposed
  // model is not.
  async isExposed(provider: string, model: string): Promise<boolean> {
    const key = `${provider}/${model}`;
    const hit = this.cache.get(key);
    const now = Date.now();
    if (hit && hit.expiresAt > now) {
      return hit.exposed;
    }
    try {
      const response = await httpRequest<unknown>({
        url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${MODEL_EXPOSURE_VALIDATION_PATH}`,
        method: HttpMethod.POST,
        headers: { Authorization: buildInterServiceAuthHeader() },
        body: { pairs: [{ provider, model }] },
        timeoutMs: MODEL_EXPOSURE_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.error(`isExposed: connector status=${String(response.status)} ${key}`);
        return false;
      }
      const parsed = validateExposedResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        this.logger.error(`isExposed: response failed schema check ${key}`);
        return false;
      }
      const exposed = parsed.data.valid.some(
        (pair) => pair.provider === provider && pair.model === model,
      );
      this.cache.set(key, { exposed, expiresAt: now + MODEL_EXPOSURE_CACHE_TTL_MS });
      return exposed;
    } catch {
      this.logger.error(`isExposed: connector unreachable ${key}`);
      return false;
    }
  }
}
