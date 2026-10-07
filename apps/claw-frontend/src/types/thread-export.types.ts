import type { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';

/** One file going into a ZIP archive. */
export type ZipEntry = {
  name: string;
  data: Uint8Array;
};

/** A finished export file, before it is saved or zipped. */
export type ThreadExportFile = {
  format: ThreadPublicationExportFormat;
  name: string;
  mime: string;
  content: string;
};

/** What the export panel offers. */
export type ThreadExportOption = {
  format: ThreadPublicationExportFormat;
  labelKey: string;
};

/** The article an export is built from. */
export type ThreadExportSource = {
  title: string;
  markdown: string;
  citations: ReadonlyArray<{ url: string }>;
  /** The public address, when the Thread is published. */
  url: string | null;
  language: string;
};

export type ThreadExportPanelProps = {
  /** File name without extension. */
  baseName: string;
  options: readonly ThreadExportOption[];
  buildFile: (format: ThreadPublicationExportFormat) => Promise<ThreadExportFile>;
  /** Hidden when there is nothing public to print yet. */
  showPdf: boolean;
};

/** What the export panel's hook needs: where files are named, and how one is built. */
export type ThreadExportPanelHookInput = {
  baseName: string;
  buildFile: (format: ThreadPublicationExportFormat) => Promise<ThreadExportFile>;
};

export type ThreadSharePlatform = {
  id: string;
  label: string;
  href: string;
};

export type ThreadShareMenuProps = {
  url: string;
  title: string;
};

/** The formats the service itself produces. HTML and text are built in the browser. */
export type ThreadServerExportFormat =
  | ThreadPublicationExportFormat.Markdown
  | ThreadPublicationExportFormat.Json
  | ThreadPublicationExportFormat.Toon;

export type ThreadExportPanelController = {
  selected: ReadonlySet<ThreadPublicationExportFormat>;
  isBusy: boolean;
  hasFailed: boolean;
  canDownload: boolean;
  toggle: (format: ThreadPublicationExportFormat) => void;
  download: () => Promise<void>;
  savePdf: () => void;
};

export type ThreadShareController = {
  hasCopied: boolean;
  hasCopyFailed: boolean;
  canShareNatively: boolean;
  copyLink: () => Promise<void>;
  shareNatively: () => Promise<void>;
};
