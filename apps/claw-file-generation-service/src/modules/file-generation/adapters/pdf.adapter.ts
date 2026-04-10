import PDFDocument from 'pdfkit';

export const convertToPdf = async (content: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Parse markdown-like content into PDF
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trimStart();

      if (trimmed.startsWith('# ')) {
        doc.fontSize(22).font('Helvetica-Bold').text(trimmed.slice(2), { paragraphGap: 8 });
      } else if (trimmed.startsWith('## ')) {
        doc.fontSize(18).font('Helvetica-Bold').text(trimmed.slice(3), { paragraphGap: 6 });
      } else if (trimmed.startsWith('### ')) {
        doc.fontSize(14).font('Helvetica-Bold').text(trimmed.slice(4), { paragraphGap: 4 });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(`  \u2022 ${trimmed.slice(2)}`, { paragraphGap: 2 });
      } else if (trimmed.length === 0) {
        doc.moveDown(0.5);
      } else {
        doc.fontSize(11).font('Helvetica').text(trimmed, { paragraphGap: 2 });
      }
    }

    doc.end();
  });
};
