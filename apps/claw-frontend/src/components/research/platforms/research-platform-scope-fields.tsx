import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ResearchPlatformFormFieldsProps } from '@/types/research-platform.types';

/** Where and how much: domains, languages, priority, result and time limits, notes. */
export function ResearchPlatformScopeFields({
  t,
  form,
  setField,
}: ResearchPlatformFormFieldsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1 sm:col-span-3">
        <label htmlFor="rpl-domains" className="text-sm font-medium">
          {t('researchPlatforms.form.domains')}
        </label>
        <Textarea
          id="rpl-domains"
          name="domains"
          rows={2}
          value={form.domains}
          onChange={(e) => setField('domains', e.target.value)}
          spellCheck={false}
          dir="ltr"
          aria-describedby="rpl-domains-hint"
        />
        <p id="rpl-domains-hint" className="text-muted-foreground text-xs">
          {t('researchPlatforms.form.domainsHint')}
        </p>
      </div>
      <div className="flex flex-col gap-1 sm:col-span-3">
        <label htmlFor="rpl-languages" className="text-sm font-medium">
          {t('researchPlatforms.form.languages')}
        </label>
        <Input
          id="rpl-languages"
          name="languages"
          value={form.languages}
          onChange={(e) => setField('languages', e.target.value)}
          spellCheck={false}
          autoComplete="off"
          dir="ltr"
          aria-describedby="rpl-languages-hint"
        />
        <p id="rpl-languages-hint" className="text-muted-foreground text-xs">
          {t('researchPlatforms.form.languagesHint')}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="rpl-priority" className="text-sm font-medium">
          {t('researchPlatforms.form.priority')}
        </label>
        <Input
          id="rpl-priority"
          name="priority"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={form.priority}
          onChange={(e) => setField('priority', e.target.value)}
          aria-describedby="rpl-priority-hint"
        />
        <p id="rpl-priority-hint" className="text-muted-foreground text-xs">
          {t('researchPlatforms.form.priorityHint')}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="rpl-max-results" className="text-sm font-medium">
          {t('researchPlatforms.form.maxResults')}
        </label>
        <Input
          id="rpl-max-results"
          name="maxResults"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={form.maxResults}
          onChange={(e) => setField('maxResults', e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="rpl-timeout" className="text-sm font-medium">
          {t('researchPlatforms.form.timeoutMs')}
        </label>
        <Input
          id="rpl-timeout"
          name="timeoutMs"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={form.timeoutMs}
          onChange={(e) => setField('timeoutMs', e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-3">
        <label htmlFor="rpl-notes" className="text-sm font-medium">
          {t('researchPlatforms.form.notes')}
        </label>
        <Textarea
          id="rpl-notes"
          name="notes"
          rows={2}
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
        />
      </div>
    </div>
  );
}
