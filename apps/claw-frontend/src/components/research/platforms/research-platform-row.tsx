import { Pencil, ShieldCheck, Trash2 } from 'lucide-react';

import { ResearchPlatformTestResult } from '@/components/research/platforms/research-platform-test-result';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  RESEARCH_PLATFORM_ACCESS_METHOD_KEYS,
  RESEARCH_PLATFORM_API_KIND_LABELS,
  RESEARCH_PLATFORM_CELL_CLASS,
  RESEARCH_PLATFORM_EMPTY_CELL,
} from '@/constants/research-platform.constants';
import { cn } from '@/lib/utils';
import type { ResearchPlatformRowProps } from '@/types/research-platform.types';

/** One platform: a table row on a mouse, a labelled card on touch (like the search providers page). */
export function ResearchPlatformRow({
  t,
  platform,
  isToggling,
  isTesting,
  testView,
  onToggle,
  onTest,
  onEdit,
  onDelete,
}: ResearchPlatformRowProps): React.ReactElement {
  return (
    <tr
      data-testid={`research-platform-row-${platform.slug}`}
      className={cn(
        'touch:block touch:rounded-lg touch:border border-t',
        !platform.enabled && 'opacity-70',
      )}
    >
      <td
        data-label={t('researchPlatforms.col.name')}
        className={cn(RESEARCH_PLATFORM_CELL_CLASS, 'font-medium')}
      >
        <span className="flex min-w-0 flex-col">
          <span className="break-words">{platform.name}</span>
          <span className="text-muted-foreground font-mono text-xs font-normal">
            {platform.slug}
          </span>
        </span>
      </td>
      <td data-label={t('researchPlatforms.col.access')} className={RESEARCH_PLATFORM_CELL_CLASS}>
        <span className="flex flex-wrap items-center justify-end gap-1 sm:justify-start">
          <Badge variant="outline">
            {t(RESEARCH_PLATFORM_ACCESS_METHOD_KEYS[platform.accessMethod])}
          </Badge>
          {platform.apiKind === null ? null : (
            <Badge variant="secondary">{RESEARCH_PLATFORM_API_KIND_LABELS[platform.apiKind]}</Badge>
          )}
        </span>
      </td>
      <td
        data-label={t('researchPlatforms.col.domains')}
        className={cn(RESEARCH_PLATFORM_CELL_CLASS, 'text-muted-foreground break-all')}
      >
        {platform.domains.length > 0 ? platform.domains.join(', ') : RESEARCH_PLATFORM_EMPTY_CELL}
      </td>
      <td
        data-label={t('researchPlatforms.col.languages')}
        className={cn(RESEARCH_PLATFORM_CELL_CLASS, 'text-muted-foreground')}
      >
        {platform.languages.length > 0
          ? platform.languages.join(', ')
          : t('researchPlatforms.anyLanguage')}
      </td>
      <td
        data-label={t('researchPlatforms.col.priority')}
        className={cn(RESEARCH_PLATFORM_CELL_CLASS, 'tabular-nums')}
      >
        {platform.priority}
      </td>
      <td data-label={t('researchPlatforms.col.enabled')} className={RESEARCH_PLATFORM_CELL_CLASS}>
        <span data-testid={`research-platform-toggle-${platform.slug}`} className="inline-flex">
          <Switch
            checked={platform.enabled}
            disabled={isToggling}
            onCheckedChange={(checked) => onToggle(platform, checked)}
            aria-label={t('researchPlatforms.toggleLabel', { name: platform.name })}
          />
        </span>
      </td>
      <td
        data-label={t('researchPlatforms.col.actions')}
        className="touch:block touch:border-t px-3 py-2 text-end"
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isTesting}
            onClick={() => onTest(platform.id)}
            data-testid={`research-platform-test-${platform.slug}`}
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            {isTesting ? t('researchPlatforms.testing') : t('researchPlatforms.test')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(platform)}
            aria-label={t('researchPlatforms.edit')}
            data-testid={`research-platform-edit-${platform.slug}`}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(platform)}
            aria-label={t('researchPlatforms.delete')}
            data-testid={`research-platform-delete-${platform.slug}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
        {testView === null ? null : (
          <div className="mt-1">
            <ResearchPlatformTestResult slug={platform.slug} view={testView} />
          </div>
        )}
      </td>
    </tr>
  );
}
