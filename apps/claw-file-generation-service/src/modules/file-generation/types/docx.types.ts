// docx@9.x publishes its public API through deeply-nested, extensionless
// `export *` re-export chains (e.g. `export * from './file'`). Node16 /
// nodenext module resolution — which tsgo and TypeScript 6 both enforce —
// cannot traverse those extensionless chains, so every wildcard-exported
// member (Paragraph, TextRun, Packer, HeadingLevel, …) is dropped from the
// module's type surface (only the single explicit `Document` re-export
// survives). The CJS/ESM runtime bundles export every member correctly, so
// the adapter loads docx dynamically and projects the namespace onto this
// local contract describing exactly the slice of the API it uses.

export type DocxElement = object;

export type DocxTextRunOptions = {
  text: string;
  bold?: boolean;
  size?: number;
};

export type DocxParagraphOptions = {
  heading?: string;
  children: DocxElement[];
};

export type DocxSection = {
  children: DocxElement[];
};

export type DocxDocumentOptions = {
  sections: DocxSection[];
};

export type DocxHeadingLevels = {
  readonly HEADING_1: string;
  readonly HEADING_2: string;
  readonly HEADING_3: string;
};

export type DocxApi = {
  Document: new (options: DocxDocumentOptions) => DocxElement;
  Paragraph: new (options: DocxParagraphOptions) => DocxElement;
  TextRun: new (options: DocxTextRunOptions) => DocxElement;
  Packer: { toBuffer(file: DocxElement): Promise<Uint8Array> };
  HeadingLevel: DocxHeadingLevels;
};
