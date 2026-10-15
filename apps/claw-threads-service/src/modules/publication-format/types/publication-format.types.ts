export type FormatCitation = { evidenceId: string; url: string };

export type FormatTarget = {
  revisionId: string;
  title: string;
  markdown: string;
  citations: FormatCitation[];
  generationJobId: string | null;
  contentLocale: string;
  publicationType: string;
};

export type FormatPassRecord = {
  id: string;
  revisionId: string;
  status: string;
  code: string | null;
  resultMarkdown: string | null;
};

export type FormatPassReservation =
  | { outcome: 'RESERVED'; pass: FormatPassRecord }
  | { outcome: 'LIMIT'; used: number }
  | { outcome: 'REPLAY'; pass: FormatPassRecord };

export type FormatPreviewReply = {
  status: 'FORMATTED' | 'SKIPPED';
  code: string | null;
  markdown: string;
  citations: FormatCitation[];
};
