import type { AnswerExportFormat } from '@/enums/answer-export-format.enum';
import type { TranslateFunction } from '@/types/i18n.types';

export type AnswerExportOption = {
  format: AnswerExportFormat;
  extension: string;
  labelKey: string;
  /** Built in the browser rather than converted by the server. */
  inBrowser: boolean;
};

export type UseAnswerExportResult = {
  exportAs: (option: AnswerExportOption) => void;
  pendingFormat: AnswerExportFormat | null;
  failed: boolean;
};

export type AnswerExportMenuProps = {
  content: string;
  t: TranslateFunction;
};

export type AnswerExpandDialogProps = {
  content: string;
  t: TranslateFunction;
};
