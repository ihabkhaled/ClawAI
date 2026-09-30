import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  PROMPT_LIBRARY_MAX_BODY_LENGTH,
  PROMPT_LIBRARY_MAX_TITLE_LENGTH,
} from '@/constants/chat.constants';
import { usePromptTemplateForm } from '@/hooks/prompt-library/use-prompt-template-form';
import { useTranslation } from '@/lib/i18n';
import type { PromptTemplateFormProps } from '@/types';

/** Create / edit form: title, body (with `{{variable}}` hint) and comma-separated tags. */
export function PromptTemplateForm(props: PromptTemplateFormProps): React.ReactElement {
  const { t } = useTranslation();
  const form = usePromptTemplateForm(props);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <div className="space-y-1">
        <label htmlFor="prompt-title" className="text-sm font-medium">
          {t('promptLibrary.titleLabel')}
        </label>
        <Input
          id="prompt-title"
          value={form.values.title}
          maxLength={PROMPT_LIBRARY_MAX_TITLE_LENGTH}
          onChange={(event) => form.setField('title', event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="prompt-body" className="text-sm font-medium">
          {t('promptLibrary.bodyLabel')}
        </label>
        <Textarea
          id="prompt-body"
          rows={6}
          value={form.values.body}
          maxLength={PROMPT_LIBRARY_MAX_BODY_LENGTH}
          onChange={(event) => form.setField('body', event.target.value)}
        />
        <p className="text-muted-foreground text-xs">{t('promptLibrary.bodyHint')}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="prompt-tags" className="text-sm font-medium">
          {t('promptLibrary.tagsLabel')}
        </label>
        <Input
          id="prompt-tags"
          value={form.values.tags}
          onChange={(event) => form.setField('tags', event.target.value)}
        />
        <p className="text-muted-foreground text-xs">{t('promptLibrary.tagsHint')}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={props.onBack}>
          {t('promptLibrary.back')}
        </Button>
        <Button type="submit" disabled={!form.canSave} isLoading={props.isSaving}>
          {t('promptLibrary.save')}
        </Button>
      </div>
    </form>
  );
}
