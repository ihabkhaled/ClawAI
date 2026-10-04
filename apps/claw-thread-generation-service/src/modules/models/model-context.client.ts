import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';

import { AppConfig } from '../../app/config/app.config';

const contextWindowSchema = z.object({
  contextWindowTokens: z.number().int().positive().nullable(),
});

@Injectable()
export class ModelContextClient {
  async getWindow(provider: string, model: string): Promise<number> {
    const config = AppConfig.get();
    const url = `${config.ROUTING_SERVICE_URL}/api/v1/internal/router-models/context-window/${encodeURIComponent(provider)}/${encodeURIComponent(model)}`;
    assertSafeRequestUrl(url, declaredHost(config.ROUTING_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'error',
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('Model catalog is unavailable');
    }
    if (!response.ok) throw new ServiceUnavailableException('Model context is unavailable');
    const parsed = contextWindowSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.contextWindowTokens === null) {
      throw new ServiceUnavailableException('Model context window is unknown');
    }
    return parsed.data.contextWindowTokens;
  }
}
