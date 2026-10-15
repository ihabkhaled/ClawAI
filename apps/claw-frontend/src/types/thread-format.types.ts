import type { ThreadFormatPreview } from '@claw/shared-types';

import type { ThreadFormatView } from '@/constants/thread-format.constants';
import type { ThreadPublicationDetailController } from '@/types/thread-publication.types';

export type ThreadFormatPanelController = {
  preview: ThreadFormatPreview | null;
  view: ThreadFormatView;
  setView: (view: ThreadFormatView) => void;
  accepted: boolean;
  run: () => void;
  accept: () => void;
  discard: () => void;
  isRunning: boolean;
  isAccepting: boolean;
  errorText: string | null;
  /** Set when the pass changed nothing (already well formatted, or the guard kept the original). */
  skippedText: string | null;
  canRun: boolean;
  contentLocale: string;
};

export type ThreadFormatPanelProps = { detail: ThreadPublicationDetailController };

export type ThreadFormatPreviewViewProps = {
  markdown: string;
  contentLocale: string;
};

/** A translation key with its optional placeholders, for a FORMAT_ skip or a refusal. */
export type ThreadFormatMessage = { key: string; params?: Record<string, string> };
