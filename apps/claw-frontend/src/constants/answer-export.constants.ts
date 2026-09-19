import { AnswerExportFormat } from '@/enums/answer-export-format.enum';
import type { AnswerExportOption } from '@/types/answer-export.types';

/**
 * The "Download as" menu. MD and TXT are built in the browser (the answer is
 * already here); HTML, DOCX, PDF, XLSX, PPTX and ZIP are converted by the file service and
 * downloaded through the owner-only link (ADR-104).
 */
export const ANSWER_EXPORT_OPTIONS: readonly AnswerExportOption[] = [
  {
    format: AnswerExportFormat.MD,
    extension: 'md',
    labelKey: 'chat.exportFormats.md',
    inBrowser: true,
  },
  {
    format: AnswerExportFormat.TXT,
    extension: 'txt',
    labelKey: 'chat.exportFormats.txt',
    inBrowser: true,
  },
  {
    format: AnswerExportFormat.HTML,
    extension: 'html',
    labelKey: 'chat.exportFormats.html',
    inBrowser: false,
  },
  {
    format: AnswerExportFormat.DOCX,
    extension: 'docx',
    labelKey: 'chat.exportFormats.docx',
    inBrowser: false,
  },
  {
    format: AnswerExportFormat.PDF,
    extension: 'pdf',
    labelKey: 'chat.exportFormats.pdf',
    inBrowser: false,
  },
  // F3b (ADR-108): the answer's tables as sheets, its sections as slides, and
  // its code blocks and tables as files in a zip.
  {
    format: AnswerExportFormat.XLSX,
    extension: 'xlsx',
    labelKey: 'chat.exportFormats.xlsx',
    inBrowser: false,
  },
  {
    format: AnswerExportFormat.PPTX,
    extension: 'pptx',
    labelKey: 'chat.exportFormats.pptx',
    inBrowser: false,
  },
  {
    format: AnswerExportFormat.ZIP,
    extension: 'zip',
    labelKey: 'chat.exportFormats.zip',
    inBrowser: false,
  },
];

/** A server export is polled this often, this many times (30 s) before giving up. */
export const ANSWER_EXPORT_POLL_MS = 1_000;
export const ANSWER_EXPORT_MAX_POLLS = 30;

/** A title longer than this is cut for the filename. */
export const ANSWER_TITLE_MAX_CHARS = 60;

/**
 * Stripped from the end of a filename: the punctuation a first line tends to
 * end with ("…hue,.md"), plus the dot and space Windows refuses there.
 */
export const ANSWER_FILENAME_TRAILING_CHARS = '.,;!- ';
