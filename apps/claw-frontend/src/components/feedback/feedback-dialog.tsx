'use client';

import { Controller } from 'react-hook-form';

import { FeedbackAttachmentList } from '@/components/feedback/feedback-attachment-list';
import { FeedbackMarkdownEditor } from '@/components/feedback/feedback-markdown-editor';
import { FeedbackScreenshotPreview } from '@/components/feedback/feedback-screenshot-preview';
import { FeedbackTypeSelect } from '@/components/feedback/feedback-type-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFeedbackAttachments } from '@/hooks/feedback/use-feedback-attachments';
import { useFeedbackForm } from '@/hooks/feedback/use-feedback-form';
import { usePageContext } from '@/hooks/feedback/use-page-context';
import { useScreenshotCapture } from '@/hooks/feedback/use-screenshot-capture';
import { useTranslation } from '@/lib/i18n';
import type { FeedbackDialogProps } from '@/types/feedback-props.types';

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const { toast } = useToast();
  const attachmentState = useFeedbackAttachments();
  const screenshotState = useScreenshotCapture();
  const collectPageContext = usePageContext();

  const { form, submit, isSubmitting, submitError } = useFeedbackForm((ticketNumber) => {
    toast({ title: t('feedback.submittedWithTicket').replace('{ticketNumber}', ticketNumber) });
    attachmentState.clear();
    screenshotState.clear();
    onOpenChange(false);
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        onPaste={(event) => {
          const images = Array.from(event.clipboardData.files).filter((file) =>
            file.type.startsWith('image/'),
          );
          if (images.length > 0) {
            void attachmentState.addFiles(images);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('feedback.dialog.title')}</DialogTitle>
          <DialogDescription>{t('feedback.dialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <FeedbackTypeSelect
                value={field.value}
                onChange={field.onChange}
                error={errors.type?.message}
              />
            )}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="feedback-title">
              {t('feedback.dialog.titleLabel')}
            </label>
            <Input
              id="feedback-title"
              aria-describedby={errors.title === undefined ? undefined : 'feedback-title-error'}
              aria-invalid={errors.title !== undefined}
              placeholder={t('feedback.dialog.titlePlaceholder')}
              {...form.register('title')}
            />
            {errors.title === undefined ? null : (
              <p className="text-destructive text-sm" id="feedback-title-error">
                {t('feedback.errors.titleRequired')}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="feedback-subject">
              {t('feedback.dialog.subjectLabel')}
            </label>
            <Input
              id="feedback-subject"
              placeholder={t('feedback.dialog.subjectPlaceholder')}
              {...form.register('subject')}
            />
          </div>

          <Controller
            control={form.control}
            name="contentMarkdown"
            render={({ field }) => (
              <FeedbackMarkdownEditor
                value={field.value}
                onChange={field.onChange}
                error={
                  errors.contentMarkdown === undefined
                    ? undefined
                    : t('feedback.errors.contentRequired')
                }
              />
            )}
          />

          <FeedbackScreenshotPreview
            screenshot={screenshotState.screenshot}
            isCapturing={screenshotState.isCapturing}
            error={screenshotState.error ?? undefined}
            onCapture={() => {
              void screenshotState.capture();
            }}
            onClear={screenshotState.clear}
          />

          <FeedbackAttachmentList
            attachments={attachmentState.attachments}
            progress={attachmentState.progress}
            uploadError={attachmentState.uploadError ?? undefined}
            onRemove={attachmentState.remove}
            onFilesPicked={(files) => {
              void attachmentState.addFiles(files);
            }}
          />

          {submitError === null ? null : (
            <p className="text-destructive text-sm" role="alert">
              {t('feedback.errors.submitFailed')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('feedback.dialog.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || attachmentState.isUploading}
            onClick={() => {
              const pending = screenshotState.screenshot;
              if (pending !== null) {
                void attachmentState.addDataUrl(pending, 'screenshot.png', true);
              }
              submit(attachmentState.attachments, collectPageContext());
            }}
          >
            {isSubmitting ? t('feedback.dialog.submitting') : t('feedback.dialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
