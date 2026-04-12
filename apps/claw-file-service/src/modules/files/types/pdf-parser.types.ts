export type PdfParseResult = { text: string; numpages: number };
export type PdfParseFn = (buf: Buffer) => Promise<PdfParseResult>;
