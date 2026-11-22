import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { LiveHistoryErrorCode } from '../../../common/enums/live-history-error-code.enum';
import { PDF_RENDER_PATH, PDF_RENDER_TIMEOUT_MS } from '../constants/history.constants';

/**
 * Markdown → PDF through file-generation-service's stateless internal route (Typst renderer).
 * Nothing is stored on either side; the bytes come straight back.
 */
@Injectable()
export class PdfRenderClient {
  private readonly logger = new Logger(PdfRenderClient.name);

  async render(markdown: string, title: string | null): Promise<Buffer> {
    const app = AppConfig.get();
    const url = `${app.FILE_GENERATION_SERVICE_URL}${PDF_RENDER_PATH}`;
    assertSafeRequestUrl(url, declaredHost(app.FILE_GENERATION_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          Authorization: `Service ${app.INTER_SERVICE_AUTH_TOKEN}`,
        },
        body: JSON.stringify({ content: markdown, ...(title ? { title } : {}) }),
        signal: AbortSignal.timeout(PDF_RENDER_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`render: file-generation unreachable - ${(error as Error).message}`);
      throw new ServiceUnavailableException(LiveHistoryErrorCode.PDF_EXPORT_UNAVAILABLE);
    }
    if (!response.ok) {
      this.logger.warn(`render: file-generation answered ${String(response.status)}`);
      throw new ServiceUnavailableException(LiveHistoryErrorCode.PDF_EXPORT_UNAVAILABLE);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
