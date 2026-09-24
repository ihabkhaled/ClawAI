import {
  Archive,
  CheckCircle2,
  Clock,
  File as FileIcon,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Loader2,
  type LucideIcon,
  Presentation,
  XCircle,
} from 'lucide-react';

import { FileIngestionStatus } from '@/enums';

type FileTypeDescriptor = {
  Icon: LucideIcon;
  tone: string;
};

const DEFAULT_DESCRIPTOR: FileTypeDescriptor = {
  Icon: FileIcon,
  tone: 'bg-muted text-muted-foreground',
};

// Maps a MIME-type / filename to a lucide icon + a semantic tone class.
// The tone is intentionally muted (no `text-blue-500` etc) so it works in
// both light + dark mode and stays consistent with the design tokens.
export function getFileTypeDescriptor(mimeType: string, filename: string): FileTypeDescriptor {
  const lowerMime = (mimeType ?? '').toLowerCase();
  const lowerName = (filename ?? '').toLowerCase();

  if (lowerMime.startsWith('image/')) {
    return {
      Icon: FileImage,
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    };
  }
  if (lowerMime.startsWith('video/')) {
    return {
      Icon: FileVideo,
      tone: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    };
  }
  if (lowerMime.startsWith('audio/')) {
    return {
      Icon: FileAudio,
      tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };
  }
  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return {
      Icon: FileText,
      tone: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
  }
  if (
    lowerMime.includes('zip') ||
    lowerMime.includes('compressed') ||
    lowerMime.includes('tar') ||
    lowerName.endsWith('.zip') ||
    lowerName.endsWith('.tar') ||
    lowerName.endsWith('.gz') ||
    lowerName.endsWith('.rar') ||
    lowerName.endsWith('.7z')
  ) {
    return {
      Icon: Archive,
      tone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
  }
  if (
    lowerMime.includes('csv') ||
    lowerMime.includes('spreadsheet') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls')
  ) {
    return {
      Icon: FileSpreadsheet,
      tone: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
  }
  // Office types before the code check: every Office MIME type contains
  // "xml" (…openxmlformats…), so Word and PowerPoint files got the code icon.
  if (
    lowerMime.includes('presentation') ||
    lowerName.endsWith('.pptx') ||
    lowerName.endsWith('.ppt')
  ) {
    return {
      Icon: Presentation,
      tone: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    };
  }
  if (
    lowerMime.includes('wordprocessing') ||
    lowerMime === 'application/msword' ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc')
  ) {
    return {
      Icon: FileText,
      tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    };
  }
  if (
    lowerMime.includes('json') ||
    lowerMime.includes('xml') ||
    lowerMime.includes('javascript') ||
    lowerMime.includes('typescript') ||
    lowerName.endsWith('.json') ||
    lowerName.endsWith('.js') ||
    lowerName.endsWith('.ts') ||
    lowerName.endsWith('.tsx') ||
    lowerName.endsWith('.jsx') ||
    lowerName.endsWith('.py') ||
    lowerName.endsWith('.go') ||
    lowerName.endsWith('.rs') ||
    lowerName.endsWith('.java')
  ) {
    return {
      Icon: FileCode,
      tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
  }
  if (lowerMime.startsWith('text/') || lowerName.endsWith('.md') || lowerName.endsWith('.txt')) {
    return {
      Icon: FileText,
      tone: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    };
  }

  return DEFAULT_DESCRIPTOR;
}

export function isImageMime(mimeType: string): boolean {
  return (mimeType ?? '').toLowerCase().startsWith('image/');
}

export function isAudioMime(mimeType: string): boolean {
  return (mimeType ?? '').toLowerCase().startsWith('audio/');
}

export function isVideoMime(mimeType: string): boolean {
  return (mimeType ?? '').toLowerCase().startsWith('video/');
}

export function isPdfMime(mimeType: string, filename: string): boolean {
  const lowerMime = (mimeType ?? '').toLowerCase();
  const lowerName = (filename ?? '').toLowerCase();
  return lowerMime === 'application/pdf' || lowerName.endsWith('.pdf');
}

type IngestionStatusIcon = {
  Icon: LucideIcon;
  spin: boolean;
};

// Status must be told apart by more than color (rule: accessible, not color
// alone) — every attachment row pairs this icon with the status TEXT already
// served by `INGESTION_STATUS_LABELS`, matching the icon+text pattern used for
// a generated file's own loading/completed/error states
// (file-loading-state.tsx, file-completed-state.tsx, file-error-state.tsx).
const INGESTION_STATUS_ICONS: Record<FileIngestionStatus, IngestionStatusIcon> = {
  [FileIngestionStatus.PENDING]: { Icon: Clock, spin: false },
  [FileIngestionStatus.PROCESSING]: { Icon: Loader2, spin: true },
  [FileIngestionStatus.COMPLETED]: { Icon: CheckCircle2, spin: false },
  [FileIngestionStatus.FAILED]: { Icon: XCircle, spin: false },
};

export function getIngestionStatusIcon(status: FileIngestionStatus): IngestionStatusIcon {
  return INGESTION_STATUS_ICONS[status];
}

export function isTextLikeMime(mimeType: string, filename: string): boolean {
  const lowerMime = (mimeType ?? '').toLowerCase();
  const lowerName = (filename ?? '').toLowerCase();
  if (lowerMime.startsWith('text/')) {
    return true;
  }
  // Every Office Open XML mimeType contains "xml" (…openxmlformats…) — the
  // same trap getFileTypeDescriptor's Office check already guards against.
  // Without this, a docx/xlsx/pptx would be classified as text-like and its
  // binary bytes handed to `blob.text()` for an inline "readable" preview.
  if (lowerMime.includes('openxmlformats')) {
    return false;
  }
  if (lowerMime.includes('json') || lowerMime.includes('xml')) {
    return true;
  }
  return (
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.json') ||
    lowerName.endsWith('.csv')
  );
}
