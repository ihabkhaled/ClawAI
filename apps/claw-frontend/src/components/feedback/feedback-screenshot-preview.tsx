'use client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { FeedbackScreenshotPreviewProps } from '@/types/feedback-props.types';

export function FeedbackScreenshotPreview({
  screenshot,
  isCapturing,
  error,
  onCapture,
  onClear,
}: FeedbackScreenshotPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button type="button" onClick={onCapture} disabled={isCapturing}>
          {isCapturing ? t('feedback.capturing') : t('feedback.captureScreenshot')}
        </Button>
        {screenshot && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            aria-label={t('feedback.removeScreenshot')}
          >
            {t('common.remove')}
          </Button>
        )}
      </div>

      {screenshot && (
        <div className="relative">
          <img
            src={screenshot}
            alt={t('feedback.screenshotPreview')}
            className="max-h-64 w-auto rounded-md border object-contain"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-amber-600" role="status">
          {t(error)} {t('feedback.pasteOrUploadInstead')}
        </p>
      )}
    </div>
  );
}
