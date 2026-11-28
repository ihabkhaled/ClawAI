import { ResearchPlatformRow } from '@/components/research/platforms/research-platform-row';
import { Badge } from '@/components/ui/badge';
import { RESEARCH_PLATFORM_CATEGORY_KEYS } from '@/constants/research-platform.constants';
import type { ResearchPlatformGroupProps } from '@/types/research-platform.types';

/** One category's platforms under a heading, in priority order. */
export function ResearchPlatformGroup({
  t,
  group,
  togglingId,
  testingIds,
  testViews,
  onToggle,
  onTest,
  onEdit,
  onDelete,
}: ResearchPlatformGroupProps): React.ReactElement {
  const headingId = `research-platform-group-${group.category}`;
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-2"
      data-testid={`research-platform-group-${group.category}`}
    >
      <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold">
        {t(RESEARCH_PLATFORM_CATEGORY_KEYS[group.category])}
        <Badge variant="secondary" className="tabular-nums">
          {group.platforms.length}
        </Badge>
      </h2>
      <div className="touch:border-0 max-w-full rounded border">
        <table className="touch:block w-full">
          <thead className="touch:hidden">
            <tr className="bg-muted/50 text-muted-foreground text-start text-xs uppercase">
              <th className="px-3 py-2 text-start">{t('researchPlatforms.col.name')}</th>
              <th className="px-3 py-2 text-start">{t('researchPlatforms.col.access')}</th>
              <th className="px-3 py-2 text-start">{t('researchPlatforms.col.domains')}</th>
              <th className="px-3 py-2 text-start">{t('researchPlatforms.col.languages')}</th>
              <th className="px-3 py-2 text-start">{t('researchPlatforms.col.priority')}</th>
              <th className="px-3 py-2 text-start">{t('researchPlatforms.col.enabled')}</th>
              <th className="px-3 py-2 text-end">{t('researchPlatforms.col.actions')}</th>
            </tr>
          </thead>
          <tbody className="touch:block touch:space-y-3">
            {group.platforms.map((platform) => (
              <ResearchPlatformRow
                key={platform.id}
                t={t}
                platform={platform}
                isToggling={togglingId === platform.id}
                isTesting={testingIds.has(platform.id)}
                testView={testViews[platform.id] ?? null}
                onToggle={onToggle}
                onTest={onTest}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
