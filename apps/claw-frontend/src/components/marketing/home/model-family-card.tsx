'use client';

import { useTranslation } from '@/lib/i18n';
import type { MarketingModelFamilyCardProps } from '@/types';

export function ModelFamilyCard({ family }: MarketingModelFamilyCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="border-border bg-card flex flex-col rounded-lg border p-5">
      <h3 className="text-foreground font-semibold">{family.name}</h3>
      <p className="text-muted-foreground mt-1.5 flex-1 text-sm">{t(family.strengthKey)}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {family.models.map((model) => (
          <li
            key={model}
            className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs"
          >
            {model}
          </li>
        ))}
      </ul>
    </div>
  );
}
