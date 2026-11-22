import { Radio } from 'lucide-react';

import { LiveSourceNotice } from '@/components/live/live-source-notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LIVE_MODE_OPTIONS } from '@/constants/live.constants';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import type { LiveStartFormProps } from '@/types/live.types';

/** Link, caption language and mode; "Check link" resolves the source before Start is offered. */
export function LiveStartForm({ form, t, onStart }: LiveStartFormProps): React.ReactElement {
  return (
    <section
      aria-label={t('live.page.title')}
      className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="live-url" className="text-foreground text-sm font-medium">
          {t('live.page.urlLabel')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="live-url"
            name="live-url"
            type="url"
            inputMode="url"
            dir="ltr"
            autoComplete="off"
            value={form.url}
            placeholder={t('live.page.urlPlaceholder')}
            onChange={(event) => form.setUrl(event.target.value)}
          />
          <Button
            variant="outline"
            onClick={form.resolve}
            isLoading={form.isResolving}
            disabled={form.url.trim() === ''}
          >
            {form.isResolving ? t('live.page.checking') : t('live.page.check')}
          </Button>
        </div>
        {form.resolveError ? (
          <p role="alert" className="text-destructive text-sm">
            {form.resolveError}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="live-language" className="text-foreground text-sm font-medium">
            {t('live.page.languageLabel')}
          </label>
          <Select name="live-language" value={form.language} onValueChange={form.setLanguage}>
            <SelectTrigger id="live-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LOCALES.map((entry) => (
                <SelectItem key={entry.locale} value={entry.locale}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="live-mode" className="text-foreground text-sm font-medium">
            {t('live.page.modeLabel')}
          </label>
          <Select name="live-mode" value={form.mode} onValueChange={form.setMode}>
            <SelectTrigger id="live-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIVE_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.mode} value={option.mode}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.resolution ? (
        <LiveSourceNotice
          resolution={form.resolution}
          attestRights={form.attestRights}
          onAttestChange={form.setAttestRights}
          t={t}
        />
      ) : null}
      <p className="text-muted-foreground text-xs">{t('live.page.latencyNote')}</p>
      <Button onClick={onStart} disabled={!form.canStart} className="self-start">
        <Radio className="h-4 w-4" aria-hidden="true" />
        {t('live.page.start')}
      </Button>
    </section>
  );
}
