import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function convertToDocx(content: string): Promise<Buffer> {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();

    if (trimmed.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: trimmed.slice(2), bold: true, size: 32 })],
        }),
      );
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed.slice(3), bold: true, size: 26 })],
        }),
      );
    } else if (trimmed.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: trimmed.slice(4), bold: true, size: 22 })],
        }),
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `  \u2022 ${trimmed.slice(2)}` })],
        }),
      );
    } else if (trimmed.length === 0) {
      paragraphs.push(new Paragraph({ children: [] }));
    } else {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: trimmed })] }));
    }
  }

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
