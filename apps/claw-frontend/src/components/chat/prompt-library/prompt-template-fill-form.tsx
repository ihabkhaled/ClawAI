import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePromptTemplateFillForm } from '@/hooks/prompt-library/use-prompt-template-fill-form';
import { useTranslation } from '@/lib/i18n';
import type { PromptTemplateFillFormProps } from '@/types';

/** One input per `{{variable}}`; submitting inserts the filled text into the composer. */
export function PromptTemplateFillForm(props: PromptTemplateFillFormProps): React.ReactElement {
  const { t } = useTranslation();
  const form = usePromptTemplateFillForm(props);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <p className="text-sm font-medium">{props.template.title}</p>
      <p className="text-muted-foreground text-sm">{t('promptLibrary.fillDescription')}</p>
      {props.template.variables.map((name) => (
        <div key={name} className="space-y-1">
          <label htmlFor={`prompt-var-${name}`} className="text-sm font-medium">
            {name}
          </label>
          <Input
            id={`prompt-var-${name}`}
            value={form.values[name] ?? ''}
            onChange={(event) => form.setValue(name, event.target.value)}
          />
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={props.onBack}>
          {t('promptLibrary.back')}
        </Button>
        <Button type="submit" disabled={!form.isComplete}>
          {t('promptLibrary.insert')}
        </Button>
      </div>
    </form>
  );
}
