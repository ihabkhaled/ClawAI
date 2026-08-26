'use client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { FeedbackScreenshotPreviewProps } from '@/types/feedback-props.types';

export function FeedbackScreenshotPreview({
  screenshot,
  isCapturing,
  isSupported,
  error,
  onCapture,
  onClear,
}: FeedbackScreenshotPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/*
        No mobile browser implements getDisplayMedia, so on a phone this button
        could only ever produce an error. It is hidden there rather than shown
        and apologised for; the upload control below opens the photo library,
        which is where a phone screenshot already lives.
      */}
      {isSupported ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onCapture} disabled={isCapturing}>
            {isCapturing ? t('feedback.capturing') : t('feedback.captureScreenshot')}
          </Button>
          {screenshot === null ? null : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              aria-label={t('feedback.removeScreenshot')}
            >
              {t('feedback.removeScreenshot')}
            </Button>
          )}
        </div>
      ) : null}

      {screenshot === null ? null : (
        <img
          src={screenshot}
          alt={t('feedback.screenshotPreview')}
          className="max-h-64 w-auto rounded-md border object-contain"
        />
      )}

      {error === undefined ? null : (
        <p className="text-muted-foreground text-sm" role="status">
          {t(error)} {t('feedback.pasteOrUploadInstead')}
        </p>
      )}
    </div>
  );
}
