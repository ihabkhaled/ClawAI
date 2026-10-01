'use client';

import { Controller } from 'react-hook-form';

import { FeedbackMarkdownEditor } from '@/components/feedback/feedback-markdown-editor';
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
import {
  PUBLIC_FEEDBACK_HONEYPOT_FIELD,
  PUBLIC_FEEDBACK_MAX_EMAIL_LENGTH,
  PUBLIC_FEEDBACK_MAX_NAME_LENGTH,
} from '@/constants/feedback.constants';
import { usePageContext } from '@/hooks/feedback/use-page-context';
import { usePublicFeedbackForm } from '@/hooks/feedback/use-public-feedback-form';
import { useTranslation } from '@/lib/i18n';
import type { FeedbackDialogProps } from '@/types/feedback-props.types';

// The signed-out variant. No screenshot or attachment controls: the public API
// accepts no files. The `website` field is a honeypot, out of sight, out of the
// tab order, hidden from assistive tech and told not to autofill.
export function FeedbackPublicDialog({
  open,
  onOpenChange,
}: FeedbackDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const { toast } = useToast();
  const collectPageContext = usePageContext();

  const { form, submit, isSubmitting, submitErrorKey } = usePublicFeedbackForm(() => {
    toast({ title: t('feedback.submittedPublic') });
    onOpenChange(false);
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:p-0">
        <DialogHeader className="border-b px-5 py-4 pe-14 text-start sm:px-6 sm:pe-14">
          <DialogTitle>{t('feedback.dialog.title')}</DialogTitle>
          <DialogDescription>{t('feedback.dialog.publicDescription')}</DialogDescription>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="feedback-name">
                {t('feedback.dialog.nameLabel')}
              </label>
              <Input
                id="feedback-name"
                autoComplete="name"
                maxLength={PUBLIC_FEEDBACK_MAX_NAME_LENGTH}
                aria-invalid={errors.name !== undefined}
                aria-describedby={errors.name === undefined ? undefined : 'feedback-name-error'}
                {...form.register('name')}
              />
              {errors.name === undefined ? null : (
                <p className="text-destructive text-sm" id="feedback-name-error">
                  {t('feedback.errors.nameRequired')}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="feedback-email">
                {t('feedback.dialog.emailLabel')}
              </label>
              <Input
                id="feedback-email"
                type="email"
                autoComplete="email"
                maxLength={PUBLIC_FEEDBACK_MAX_EMAIL_LENGTH}
                aria-invalid={errors.email !== undefined}
                aria-describedby={errors.email === undefined ? undefined : 'feedback-email-error'}
                {...form.register('email')}
              />
              {errors.email === undefined ? null : (
                <p className="text-destructive text-sm" id="feedback-email-error">
                  {t('feedback.errors.emailInvalid')}
                </p>
              )}
            </div>
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
              <label className="text-sm font-medium" htmlFor="feedback-title">
                {t('feedback.dialog.titleLabel')}
              </label>
              <Input
                id="feedback-title"
                placeholder={t('feedback.dialog.titlePlaceholder')}
                {...form.register('title')}
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

          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            data-lpignore="true"
            data-1p-ignore="true"
            className="pointer-events-none absolute -start-[9999px] top-0 h-0 w-0 opacity-0"
            {...form.register(PUBLIC_FEEDBACK_HONEYPOT_FIELD)}
          />

          {submitErrorKey === null ? null : (
            <p className="text-destructive text-sm" role="alert">
              {t(submitErrorKey)}
            </p>
          )}
        </div>

        <DialogFooter className="bg-muted/30 border-t px-5 py-4 sm:px-6">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('feedback.dialog.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => submit(collectPageContext())}
          >
            {isSubmitting ? t('feedback.dialog.submitting') : t('feedback.dialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
