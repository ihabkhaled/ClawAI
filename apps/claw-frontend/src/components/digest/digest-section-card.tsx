'use client';

import type { ReactElement } from 'react';

import type { DigestSectionCardProps } from '@/types/workspace-digest.types';

export function DigestSectionCard({ section, t }: DigestSectionCardProps): ReactElement {
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
            {section.highlights.map((h, i) => (
              <li key={`${i}-${h}`}>{h}</li>
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
            {section.actionItems.map((a) => (
              <li key={a.title}>
                <span className="font-medium">{a.title}</span>
                {a.description.length > 0 ? (
                  <span className="text-muted-foreground"> — {a.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
