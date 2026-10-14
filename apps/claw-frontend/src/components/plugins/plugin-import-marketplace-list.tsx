import { Button } from '@/components/ui/button';
import type { PluginImportMarketplaceListProps } from '@/types/plugin-import.types';

/** A marketplace holds several plugins: pick one to review. Entries in other repositories import from there. */
export function PluginImportMarketplaceList({
  name,
  candidates,
  onChoose,
  t,
}: PluginImportMarketplaceListProps): React.ReactElement {
  return (
    <section
      className="space-y-3 rounded-lg border p-4"
      aria-label={t('pluginImport.marketplace.title')}
    >
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">
          {name === '' ? t('pluginImport.marketplace.title') : name}
        </h2>
        <p className="text-muted-foreground text-sm">{t('pluginImport.marketplace.description')}</p>
      </header>
      <ul className="space-y-2">
        {candidates.map((candidate) => (
          <li
            key={`${candidate.name}:${candidate.subdir ?? candidate.github ?? ''}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium break-all">{candidate.name}</p>
              {candidate.description === '' ? null : (
                <p className="text-muted-foreground text-xs">{candidate.description}</p>
              )}
              {candidate.github === undefined ? null : (
                <p dir="ltr" className="text-muted-foreground text-xs">
                  {t('pluginImport.marketplace.elsewhere', { value: candidate.github })}
                </p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onChoose(candidate);
              }}
            >
              {t('pluginImport.marketplace.choose')}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
