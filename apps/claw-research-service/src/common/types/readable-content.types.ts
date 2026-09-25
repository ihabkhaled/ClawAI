/** The main article of a page, as Readability found it, converted to Markdown. */
export type ReadableContent = {
  title: string | null;
  markdown: string;
  /** Length of Readability's plain-text rendering, used to judge whether it found anything. */
  textLength: number;
};
