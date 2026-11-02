'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CREDIT_FALLBACK_MODE_OPTIONS,
  CREDIT_FALLBACK_MODE_SELECT_ID,
} from '@/constants/credit-fallback-mode.constants';
import { useTranslation } from '@/lib/i18n';
import type { CreditFallbackModeCardProps } from '@/types/credit-fallback-mode.types';

/** What happens when the model you picked has used up its credit. */
export function CreditFallbackModeCard({
  value,
  isPending,
  onChange,
}: CreditFallbackModeCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('settings.creditFallbackMode')}</CardTitle>
        <CardDescription>{t('settings.creditFallbackModeDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <label htmlFor={CREDIT_FALLBACK_MODE_SELECT_ID} className="text-sm font-medium">
          {t('settings.creditFallbackModeLabel')}
        </label>
        <Select value={value} onValueChange={onChange} disabled={isPending}>
          <SelectTrigger id={CREDIT_FALLBACK_MODE_SELECT_ID} className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREDIT_FALLBACK_MODE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
