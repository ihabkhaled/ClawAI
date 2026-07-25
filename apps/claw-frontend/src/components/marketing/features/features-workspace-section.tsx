'use client';

import { FEATURES_WORKSPACE_CONNECTORS } from '@/constants/marketing-features.constants';
import { useTranslation } from '@/lib/i18n';

// Workspace connectors. Vendor names are brand literals; only the "what it
// does for you" line is translated.
export function FeaturesWorkspaceSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="workspace" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.features.workspace.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.features.workspace.intro')}</p>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES_WORKSPACE_CONNECTORS.map((connector) => (
            <li key={connector.name} className="border-border bg-card rounded-lg border p-4">
              <h3 className="text-foreground text-sm font-semibold">{connector.name}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">{t(connector.descKey)}</p>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground mx-auto mt-10 max-w-3xl text-sm">
          {t('marketing.features.workspace.outro')}
        </p>
      </div>
    </section>
  );
}
