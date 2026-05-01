'use client';

import { Download, FileText } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import type { GmailAttachmentListProps } from '@/types/gmail.types';
import { formatBytes } from '@/utilities/format-bytes.utility';

export function GmailAttachmentList({
  attachments,
  t,
}: GmailAttachmentListProps): ReactElement | null {
  if (attachments.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3">
      <span className="text-xs font-semibold text-muted-foreground">
        {t('gmail.message.attachments', { count: String(attachments.length) })}
      </span>
      <ul className="flex flex-col gap-1">
        {attachments.map((att) => (
          <li
            key={att.fileServiceFileId}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate" title={att.filename}>
                {att.filename}
              </span>
              <span className="text-muted-foreground">{formatBytes(att.sizeBytes)}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              asChild
              aria-label={t('gmail.message.download', { name: att.filename })}
            >
              <a
                href={`/api/v1/files/download/${encodeURIComponent(att.fileServiceFileId)}`}
                target="_blank"
                rel="noreferrer"
                download={att.filename}
              >
                <Download className="size-3.5" aria-hidden />
              </a>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
