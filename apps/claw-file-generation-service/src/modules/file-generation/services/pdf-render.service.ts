import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { PdfRenderer } from '../adapters/pdf.adapter';

/**
 * Stateless Markdown → PDF for other services (live-service history export, ADR-221).
 * Nothing is stored and no generation row is written; the caller streams the bytes.
 */
@Injectable()
export class PdfRenderService {
  private readonly renderer = new PdfRenderer();

  render(content: string, title: string | null): Buffer {
    try {
      return this.renderer.render(content, title);
    } catch {
      throw new UnprocessableEntityException('PDF_RENDER_FAILED');
    }
  }
}
