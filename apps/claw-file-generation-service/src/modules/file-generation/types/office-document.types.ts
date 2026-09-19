/** One worksheet of an exported workbook (F3b, ADR-108). */
export type SheetSpec = {
  name: string;
  rows: string[][];
  /** The first row is a header: bold, frozen and filterable. */
  hasHeader: boolean;
  rtl: boolean;
};

/** One slide of an exported deck. */
export type SlideSpec = {
  title: string;
  /** Paragraphs and list items, in order; `level` > 0 is a bullet depth. */
  lines: SlideLine[];
  table: string[][] | null;
  code: string | null;
  rtl: boolean;
};

export type SlideLine = { text: string; level: number; bold: boolean };

/** One file inside a zip bundle. */
export type BundleFile = { path: string; content: string };
