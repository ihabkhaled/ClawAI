import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../app/config/app.config';

const researchRunSchema = z.object({
  id: z.string(),
  status: z.string(),
  bundle: z.record(z.string(), z.unknown()),
});

export type ResearchEvidence = {
  researchRunId: string;
  bundle: Record<string, unknown>;
  sha256: string;
  version: 1;
};

@Injectable()
export class ResearchClient {
  async run(userId: string, intent: string, correlationId: string): Promise<ResearchEvidence> {
    const config = AppConfig.get();
    const url = `${config.RESEARCH_SERVICE_URL}/api/v1/internal/research/runs`;
    assertSafeRequestUrl(url, declaredHost(config.RESEARCH_SERVICE_URL));

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          'x-request-id': correlationId,
        },
        body: JSON.stringify({
          userId,
          intent,
          workflow: 'SEARCH_FETCH_EXTRACT',
          mode: 'detailed',
          correlationId,
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch {
      throw new ServiceUnavailableException('Research service is unavailable');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(`Research request failed (${String(response.status)})`);
    }

    const parsed = researchRunSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.status !== 'COMPLETED') {
      throw new ServiceUnavailableException('Research evidence response is invalid');
    }
    const serialized = JSON.stringify(parsed.data.bundle);
    return {
      researchRunId: parsed.data.id,
      bundle: parsed.data.bundle,
      sha256: createHash('sha256').update(serialized).digest('hex'),
      version: 1,
    };
  }
}
