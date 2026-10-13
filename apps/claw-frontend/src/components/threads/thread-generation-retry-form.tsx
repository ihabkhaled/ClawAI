import { RotateCcw, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadErrorNotice } from '@/components/threads/thread-error-notice';
import { ThreadModelPicker } from '@/components/threads/thread-model-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';
import type { ThreadGenerationRetryFormProps } from '@/types/thread-generation-progress.types';
import { threadRoleLabelKey } from '@/utilities/thread-generation-progress.utility';

/** "Retry with changes": the owner can change topic, spend cap and every role's model first. */
export function ThreadGenerationRetryForm({ form }: ThreadGenerationRetryFormProps): ReactElement {
  const { t } = useTranslation();
  return (
    <Dialog open={form.isOpen} onOpenChange={(open) => (open ? form.open() : form.close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('chat.threadProgress.retryTitle')}</DialogTitle>
          <DialogDescription>{t('chat.threadProgress.failureRetryable')}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            form.submit();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            {t('chat.threadTopic')}
            <Textarea
              required
              minLength={10}
              maxLength={10000}
              value={form.topic}
              onChange={(event) => form.setTopic(event.target.value)}
              className="min-h-24"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t('chat.threadSpendCapUsd')}
            <Input
              required
              type="number"
              min="0.01"
              max="1000"
              step="0.01"
              value={form.spendCapUsd}
              onChange={(event) => form.setSpendCapUsd(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {form.roles.map((role) => (
              <ThreadModelPicker
                key={role.roleId}
                id={`thread-retry-${role.roleId}`}
                label={`${t(threadRoleLabelKey(role.roleKind))} (${role.roleId})`}
                value={role.model}
                onChange={(selected) => form.changeModel(role.roleId, selected)}
              />
            ))}
          </div>
          {form.error === null ? null : <ThreadErrorNotice message={form.error} />}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              disabled={form.isSubmitting}
              isLoading={form.isSubmitting}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('chat.threadProgress.retrySubmit')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.close}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
