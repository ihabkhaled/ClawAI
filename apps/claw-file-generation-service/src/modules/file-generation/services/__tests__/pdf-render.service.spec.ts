import { UnprocessableEntityException } from '@nestjs/common';

// The Typst native binding is not needed: the renderer is stubbed below.
vi.mock('@myriaddreamin/typst-ts-node-compiler', () => ({ NodeCompiler: { create: vi.fn() } }));

import { PdfRenderer } from '../../adapters/pdf.adapter';
import { PdfRenderService } from '../pdf-render.service';

describe('PdfRenderService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the rendered PDF bytes for Markdown', () => {
    const bytes = Buffer.from('%PDF-1.7');
    const render = vi.spyOn(PdfRenderer.prototype, 'render').mockReturnValue(bytes);

    const result = new PdfRenderService().render('# Live history', 'History');

    expect(result).toBe(bytes);
    expect(render).toHaveBeenCalledWith('# Live history', 'History');
  });

  it('maps a renderer failure to 422 without echoing the content', () => {
    vi.spyOn(PdfRenderer.prototype, 'render').mockImplementation(() => {
      throw new Error('PDF rendering failed');
    });

    expect(() => new PdfRenderService().render('secret transcript', null)).toThrow(
      new UnprocessableEntityException('PDF_RENDER_FAILED'),
    );
  });
});
