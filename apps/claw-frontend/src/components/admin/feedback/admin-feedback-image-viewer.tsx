'use client';

import { ImageOff } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePreviewStatus } from '@/enums';
import { useAttachmentPreview } from '@/hooks/admin/feedback/use-attachment-preview';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { AdminFeedbackImageViewerProps } from '@/types/feedback-props.types';

// Two rewrites' worth of history, because both failures were the same mistake
// in different clothes: the panel ignored what it was actually showing.
//
// It first drew its own close button on a transparent full-bleed surface, so
// two X glyphs floated over the backdrop with no frame under them. The fix
// framed it — and then a fixed, near-full-screen panel showed a one-pixel
// screenshot as an empty void, which looked just as broken.
//
// The panel is sized by its content now. It reports the real dimensions, scales
// anything too small to see, draws the image on a checkered canvas so its edges
// are visible, and says so plainly when the file will not decode.
export function AdminFeedbackImageViewer({
  src,
  alt,
  open,
  onOpenChange,
}: AdminFeedbackImageViewerProps): ReactElement {
  const { t } = useTranslation();
  const { status, width, height, isTiny, handleLoad, handleError } = useAttachmentPreview(src);
  const label = alt.length === 0 ? t('feedback.admin.detail.imagePreview') : alt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-auto max-w-[min(96vw,72rem)] flex-col gap-0 overflow-hidden p-0 sm:w-auto sm:max-w-[min(96vw,72rem)] sm:p-0">
        <DialogHeader className="flex h-14 shrink-0 flex-row items-center gap-3 space-y-0 border-b ps-5 pe-16 text-start">
          <DialogTitle className="min-w-0 flex-1 truncate text-sm font-medium" title={label}>
            {label}
          </DialogTitle>
          {status === ImagePreviewStatus.LOADED ? (
            <span className="text-muted-foreground shrink-0 font-mono text-xs">
              {t('feedback.admin.detail.imageDimensions', { width, height })}
            </span>
          ) : null}
        </DialogHeader>

        <div className="image-preview-canvas flex min-h-[12rem] min-w-[22rem] flex-1 items-center justify-center overflow-auto p-6">
          {status === ImagePreviewStatus.FAILED ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
              <ImageOff className="size-8" aria-hidden="true" />
              <p>{t('feedback.admin.detail.imageUnavailable')}</p>
            </div>
          ) : (
            <img
              src={src}
              alt={label}
              onLoad={handleLoad}
              onError={handleError}
              className={cn(
                'max-h-[70dvh] max-w-full rounded-sm object-contain',
                status === ImagePreviewStatus.LOADING && 'opacity-0',
                isTiny && 'image-preview-pixelated size-64',
              )}
            />
          )}
          {status === ImagePreviewStatus.LOADING ? (
            <p className="text-muted-foreground text-sm" role="status">
              {t('feedback.admin.detail.imageLoading')}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end border-t px-4 py-3">
          <Button asChild variant="outline" size="sm">
            <a href={src} target="_blank" rel="noreferrer">
              {t('feedback.admin.detail.openOriginal')}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
