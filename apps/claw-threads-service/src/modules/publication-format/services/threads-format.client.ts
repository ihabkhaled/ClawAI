import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { FORMAT_REQUEST_TIMEOUT_MS } from '../constants/publication-format.constants';
import type { FormatCitation, FormatPreviewReply } from '../types/publication-format.types';

const replySchema = z.object({
  status: z.enum(['FORMATTED', 'SKIPPED']),
  code: z.string().nullable(),
  markdown: z.string().min(1),
  citations: z.array(z.object({ evidenceId: z.string(), url: z.string().url() })),
});

export type FormatRequest = {
  ownerId: string;
  idempotencyKey: string;
  correlationId: string;
  contentLocale: string;
  publicationType: string;
  title: string;
  parentJobId: string;
  draft: { markdown: string; citations: FormatCitation[] };
};

/** Calls the generation service's one internal format route; the service token never leaves here. */
@Injectable()
export class ThreadsFormatClient {
  async preview(input: FormatRequest): Promise<FormatPreviewReply> {
    const config = AppConfig.get();
    const url = `${config.THREAD_GENERATION_SERVICE_URL}/api/v1/internal/threads/format-preview`;
    assertSafeRequestUrl(url, declaredHost(config.THREAD_GENERATION_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(FORMAT_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException('Formatting is unavailable right now');
    }
    if (!response.ok) throw this.refusal(response.status);
    const parsed = replySchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new ServiceUnavailableException('Formatting response is invalid');
    return parsed.data;
  }

  private refusal(status: number): Error {
    if (status === 400) return new BadRequestException('Formatting request is invalid');
    if (status === 403) {
      return new ForbiddenException(
        'Your plan or allowance does not cover an AI formatting pass right now.',
      );
    }
    return status === 404
      ? new NotFoundException('Publication not found')
      : new ServiceUnavailableException(`Formatting failed (${String(status)})`);
  }
}
