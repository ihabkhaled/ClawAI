import type { ReactNode } from 'react';

import type {
  FeedbackAttachment,
  FeedbackHistoryEntry,
  FeedbackStatusCounts,
  FeedbackTicket,
} from '@/types/feedback.types';

export type FeedbackLocalAttachment = {
  id: string;
  name: string;
  size: number;
  file: File;
};

export type FeedbackAttachmentListProps = {
  attachments: FeedbackAttachment[];
  progress: Record<string, number>;
  onRemove: (id: string) => void;
  onFilesPicked: (files: File[]) => void;
  uploadError?: string;
};

export type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type FeedbackLauncherProps = {
  onOpen: () => void;
};

export type FeedbackMarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export type FeedbackScreenshotPreviewProps = {
  screenshot: string | null;
  isCapturing: boolean;
  error?: string;
  onCapture: () => void;
  onClear: () => void;
};

export type FeedbackTypeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export type AdminFeedbackRow = FeedbackTicket;

export type AdminFeedbackListProps = {
  items: AdminFeedbackRow[];
  onSelect: (id: string) => void;
};

export type AdminFeedbackDetailDialogProps = {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type AdminFeedbackFiltersProps = {
  status: string;
  onStatusChange: (status: string) => void;
  type: string;
  onTypeChange: (type: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  counts: FeedbackStatusCounts;
  totalCount: number;
};

export type AdminFeedbackImagePreview = {
  src: string;
  alt: string;
};

export type AdminFeedbackDetailSectionProps = {
  title: string;
  children: ReactNode;
};

export type AdminFeedbackMetaItemProps = {
  label: string;
  value: string;
  isMono?: boolean;
};

export type AdminFeedbackHistoryListProps = {
  entries: FeedbackHistoryEntry[];
};

export type AdminFeedbackImageViewerProps = {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type AdminFeedbackStatusActionsProps = {
  status: string;
  isChanging: boolean;
  onChange: (newStatus: string) => void;
};

export interface AdminFeedbackAttachmentThumbnailProps {
  ticketId: string;
  attachment: FeedbackAttachment;
  onOpen: (url: string, filename: string) => void;
}
