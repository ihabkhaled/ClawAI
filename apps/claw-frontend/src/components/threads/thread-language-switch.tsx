'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import type { PublicThreadPublication } from '@/types/thread-publication.types';
import { threadLanguageName } from '@/utilities/thread-language-name.utility';

/**
 * Chooses the language of the Thread's text. It changes `?lang` only: the interface, the comments
 * and the reactions stay in the reader's app language, so a Thread written in English can be read
 * in Arabic inside an English app. Rendered as a plain select so it works before hydration.
 */
export function ThreadLanguageSwitch({
  publication,
}: {
  publication: PublicThreadPublication;
}): ReactElement | null {
  const { t } = useTranslation();
  const router = useRouter();
  const available = publication.availableLocales ?? [];
  const sourceLocale = publication.sourceLocale ?? publication.contentLocale;
  if (available.length < 2) {
    return null;
  }

  function show(locale: string): void {
    const path = window.location.pathname;
    router.replace(locale === sourceLocale ? path : `${path}?lang=${locale}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="thread-language-switch">
      <label className="text-muted-foreground flex items-center gap-2 text-sm">
        <span>{t('threadTranslation.languageLabel')}</span>
        <select
          className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-sm"
          value={publication.contentLocale}
          onChange={(event) => show(event.target.value)}
        >
          {SUPPORTED_LOCALES.filter((entry) => available.includes(entry.locale)).map((entry) => (
            <option key={entry.locale} value={entry.locale} lang={entry.locale}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      {publication.translated === true ? (
        <p className="text-muted-foreground text-sm">
          {t('threadTranslation.translatedNotice', { language: threadLanguageName(sourceLocale) })}{' '}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => show(sourceLocale)}
          >
            {t('threadTranslation.showOriginal')}
          </Button>
        </p>
      ) : null}
    </div>
  );
}
