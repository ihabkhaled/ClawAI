'use client';

import type { ReactElement } from 'react';

import type { DigestSectionCardProps } from '@/types/workspace-digest.types';
import { withDedupedKeys } from '@/utilities/stable-keys.utility';

export function DigestSectionCard({ section, t }: DigestSectionCardProps): ReactElement {
  const highlightItems = withDedupedKeys(section.highlights, (h) => h);
  const actionItemEntries = withDedupedKeys(section.actionItems, (a) => a.title);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold uppercase">
          {section.provider}
        </span>
      </div>
      <p className="text-sm">{section.summary}</p>
      {section.highlights.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {t('digest.section.highlights')}
          </span>
          <ul className="ml-4 list-disc space-y-1 text-xs text-muted-foreground">
            {highlightItems.map(({ key, item }) => (
              <li key={key}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {section.actionItems.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {t('digest.section.actionItems')}
          </span>
          <ul className="ml-4 list-disc space-y-1 text-xs">
            {actionItemEntries.map(({ key, item }) => (
              <li key={key}>
                <span className="font-medium">{item.title}</span>
                {item.description.length > 0 ? (
                  <span className="text-muted-foreground"> — {item.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
