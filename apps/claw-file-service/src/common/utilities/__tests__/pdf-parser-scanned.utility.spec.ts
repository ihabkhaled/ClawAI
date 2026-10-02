import { extractTextFromPdf, renderPdfPages } from '../pdf-parser.utility';

/**
 * Real, tiny PDFs built in the test (no mock): the scanned/short-text
 * distinction depends on what pdf.js really reports, so a mock would only
 * restate the implementation. The xref table is omitted on purpose; pdf.js
 * rebuilds it.
 */
const buildPdf = (content: string, xobjects: string): Buffer => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> ${xobjects} >> >>`,
    `<< /Length ${String(content.length)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const body = objects.map((o, i) => `${String(i + 1)} 0 obj\n${o}\nendobj\n`).join('');
  return Buffer.from(`%PDF-1.4\n${body}trailer\n<< /Root 1 0 R /Size 6 >>\n%%EOF\n`, 'latin1');
};

const shortTextPdf = (): Buffer => buildPdf('BT /F1 12 Tf 20 100 Td (Hello ClawAI) Tj ET', '');

const imageOnlyPdf = (): Buffer => {
  const image = `<< /Type /XObject /Subtype /Image /Width 100 /Height 100 /ColorSpace /DeviceGray /BitsPerComponent 8 /Length 10000 >>\nstream\n${'A'.repeat(
    10000,
  )}\nendstream`;
  const base = buildPdf('q 100 0 0 100 20 20 cm /Im1 Do Q', '/XObject << /Im1 6 0 R >>').toString(
    'latin1',
  );
  const withImage = base
    .replace('trailer', `6 0 obj\n${image}\nendobj\ntrailer`)
    .replace('/Size 6', '/Size 7');
  return Buffer.from(withImage, 'latin1');
};

describe('extractTextFromPdf scanned detection (real PDFs)', () => {
  it('keeps the text of a short text PDF and does not call it scanned', async () => {
    const result = await extractTextFromPdf(shortTextPdf(), 100);

    expect(result.text).toContain('Hello ClawAI');
    expect(result.isScanned).toBe(false);
  });

  it('calls a PDF with no text and an image object scanned', async () => {
    const result = await extractTextFromPdf(imageOnlyPdf(), 100);

    expect(result.pages.every((page) => page.text.trim() === '')).toBe(true);
    expect(result.isScanned).toBe(true);
  });
});

describe('renderPdfPages (real PDF)', () => {
  it('draws a page as a PNG image', async () => {
    const pages = await renderPdfPages(shortTextPdf(), 3, 1);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.subarray(1, 4).toString('latin1')).toBe('PNG');
  });
});
