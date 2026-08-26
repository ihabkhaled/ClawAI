import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import {
  EXPOSED_MODEL_VALIDATION_PATH,
  EXPOSED_MODEL_VALIDATION_TIMEOUT_MS,
} from '../constants/exposed-model.constants';

const validateExposedResponseSchema = z.object({
  valid: z.array(z.object({ provider: z.string(), model: z.string() })),
});

@Injectable()
export class ExposedModelClient {
  private readonly logger = new Logger(ExposedModelClient.name);

  // Asks connector-service which of these (provider, model) pairs are real,
  // exposed, chat-capable deployments. auth-service cannot read connector
  // inventory directly, so this is the only way to tell a genuine model from
  // a string an administrator typed.
  //
  // Fails CLOSED. If connector-service is unreachable or answers with
  // something unexpected, this throws rather than returning an empty or
  // partial set: treating an outage as "nothing is valid" would wipe a plan,
  // and treating it as "everything is valid" would defeat the check.
  async findExposed(
    pairs: Array<{ provider: string; model: string }>,
  ): Promise<Array<{ provider: string; model: string }>> {
    const response = await httpRequest<unknown>({
      url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${EXPOSED_MODEL_VALIDATION_PATH}`,
      method: HttpMethod.POST,
      headers: { Authorization: buildInterServiceAuthHeader() },
      body: { pairs },
      timeoutMs: EXPOSED_MODEL_VALIDATION_TIMEOUT_MS,
    });
    if (!response.ok) {
      this.logger.error(`findExposed: connector status=${String(response.status)}`);
      throw new Error('Model exposure validation failed');
    }
    const parsed = validateExposedResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      this.logger.error('findExposed: response failed schema check');
      throw new Error('Model exposure validation response invalid');
    }
    return parsed.data.valid;
  }
}
