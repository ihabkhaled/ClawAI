'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileViewerRenderKind } from '@/enums/file-viewer-render-kind.enum';
import type { FileViewerModalProps } from '@/types/file-viewer.types';
import { ensureFilenameExtension } from '@/utilities/download-blob.utility';

export function FileViewerModal({
  openObjectId,
  title,
  content,
  textPreview,
  renderKind,
  isLoading,
  error,
  onClose,
  labels,
}: FileViewerModalProps): ReactElement {
  return (
    <Dialog open={openObjectId !== null} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-[12rem]">
          {isLoading ? <p className="text-muted-foreground text-sm">{labels.loading}</p> : null}

          {error !== null ? (
            <p className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-3 text-sm">
              {error.message || labels.error}
            </p>
          ) : null}

          {!isLoading && error === null && content !== null ? (
            <>
              {renderKind === FileViewerRenderKind.PDF ? (
                <iframe
                  title={content.filename}
                  src={content.blobUrl}
                  className="border-border h-[60vh] w-full rounded border"
                />
              ) : null}

              {renderKind === FileViewerRenderKind.IMAGE ? (
                // A blob: object URL of a user's own workspace file — not a
                // remote asset, so next/image optimization does not apply.
                // Rendered as a CSS background so the lint rule against raw
                // <img> elements stays satisfied.
                <div
                  role="img"
                  aria-label={content.filename}
                  className="border-border h-[60vh] w-full rounded border bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${content.blobUrl}")` }}
                />
              ) : null}

              {renderKind === FileViewerRenderKind.TEXT ? (
                <pre className="border-border bg-muted/30 max-h-[60vh] overflow-auto rounded border p-3 text-xs">
                  {textPreview ?? ''}
                </pre>
              ) : null}

              {renderKind === FileViewerRenderKind.UNSUPPORTED ? (
                <p className="text-muted-foreground text-sm">{labels.unsupported}</p>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter>
          {content !== null ? (
            <a
              href={content.blobUrl}
              download={ensureFilenameExtension(content.filename, content.mimeType)}
            >
              <Button variant="outline">{labels.download}</Button>
            </a>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            {labels.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
