'use client';

import Link from 'next/link';

import { ModelFamilyCard } from '@/components/marketing/home/model-family-card';
import { MARKETING_HOME_PATHS } from '@/constants/marketing-home.constants';
import { useTranslation } from '@/lib/i18n';
import type { ModelRosterSectionProps } from '@/types';

/**
 * The models a visitor actually gets, read from the live connector catalog.
 *
 * This section used to render two hand-written constants. They had drifted
 * badly: the family list named Moonshot Kimi, Zhipu GLM, Alibaba Qwen and
 * Amazon Bedrock — vendors with no working model sync here — alongside a
 * "newest models" block listing MiniMax and NVIDIA models that appear nowhere
 * in this codebase, and Claude/GPT version numbers that disagreed with the
 * other static list one directory away. None of it could be wrong in a way a
 * test would catch, and the page had no review date.
 *
 * Now every name on it is a model this deployment can actually serve. The
 * "newest models" block is gone rather than reimplemented: the catalog has no
 * release-date field, so any "newest" claim would be invented again.
 *
 * When the catalog cannot be read the section renders its heading and the
 * link to the models hub, and simply lists nothing — an empty roster is
 * honest, whereas the previous behaviour was to show a list that had been
 * wrong for months.
 */
export function ModelRosterSection({ providers }: ModelRosterSectionProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="models" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.home.modelRoster.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.home.modelRoster.intro')}</p>
        </div>

        {providers.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ModelFamilyCard key={provider.provider} provider={provider} />
            ))}
          </div>
        ) : null}

        <p className="text-muted-foreground mx-auto mt-8 max-w-3xl text-center text-sm">
          {t('marketing.home.modelRoster.footnote')}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link href={MARKETING_HOME_PATHS.FEATURES} className="text-primary hover:underline">
            {t('marketing.home.modelRoster.linkFeatures')}
          </Link>
          <Link href={MARKETING_HOME_PATHS.ARCHITECTURE} className="text-primary hover:underline">
            {t('marketing.home.modelRoster.linkArchitecture')}
          </Link>
        </div>
      </div>
    </section>
  );
}
