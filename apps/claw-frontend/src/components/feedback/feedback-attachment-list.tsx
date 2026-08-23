'use client';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FEEDBACK_ACCEPTED_IMAGE_TYPES } from '@/constants/feedback.constants';
import { useTranslation } from '@/lib/i18n';
import type { FeedbackAttachmentListProps } from '@/types/feedback-props.types';

export function FeedbackAttachmentList({
  attachments,
  progress,
  onRemove,
  onFilesPicked,
  uploadError,
}: FeedbackAttachmentListProps) {
  const { t } = useTranslation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesPicked(files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesPicked(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-gray-400"
        aria-label={t('feedback.uploadAttachments')}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FEEDBACK_ACCEPTED_IMAGE_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-sm text-gray-600">{t('feedback.dragDropOrClickToUpload')}</p>
      </Button>

      {uploadError && (
        <p className="text-sm text-red-600" role="alert">
          {t(uploadError)}
        </p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.fileId}
              className="flex items-center justify-between rounded-md bg-gray-50 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{attachment.filename}</p>
                <p className="text-xs text-gray-500">{formatSize(attachment.sizeBytes)}</p>
                {(progress[attachment.fileId] ?? 100) < 100 && (
                  <Progress value={progress[attachment.fileId] ?? 0} className="mt-1" />
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(attachment.fileId)}
                aria-label={t('feedback.removeAttachment', { filename: attachment.filename })}
              >
                {t('common.remove')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
