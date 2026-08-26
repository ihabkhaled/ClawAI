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

// The dialog scrolled as one block, so Submit slid off the bottom while the
// user was still typing and the title scrolled away with it. Header and footer
// are pinned now and only the fields between them scroll.
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
        className="flex max-h-[92dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:p-0"
        onPaste={(event) => {
          const images = Array.from(event.clipboardData.files).filter((file) =>
            file.type.startsWith('image/'),
          );
          if (images.length > 0) {
            void attachmentState.addFiles(images);
          }
        }}
      >
        <DialogHeader className="border-b px-5 py-4 pe-14 text-start sm:px-6 sm:pe-14">
          <DialogTitle>{t('feedback.dialog.title')}</DialogTitle>
          <DialogDescription>{t('feedback.dialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <FeedbackTypeSelect
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.type === undefined ? undefined : t('feedback.errors.typeRequired')}
                />
              )}
            />

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

          <div className="border-border/60 bg-muted/20 space-y-4 rounded-lg border p-4">
            <FeedbackScreenshotPreview
              screenshot={screenshotState.screenshot}
              isCapturing={screenshotState.isCapturing}
              isSupported={screenshotState.isSupported}
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
          </div>

          {submitError === null ? null : (
            <p className="text-destructive text-sm" role="alert">
              {t('feedback.errors.submitFailed')}
            </p>
          )}
        </div>

        <DialogFooter className="bg-muted/30 border-t px-5 py-4 sm:px-6">
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
