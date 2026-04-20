'use client';

import { Globe } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RESEARCH_MODES } from '@/constants/research.constants';
import { ResearchMode } from '@/enums/research-mode.enum';
import { useTranslation } from '@/lib/i18n';
import type { ResearchToggleProps } from '@/types';

export function ResearchToggle({
  value,
  onChange,
  disabled,
}: ResearchToggleProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      <Globe
        className={
          value.mode === ResearchMode.OFF ? 'size-4 text-muted-foreground' : 'size-4 text-primary'
        }
        aria-hidden
      />
      <Select
        value={value.mode}
        onValueChange={(next) => onChange({ ...value, mode: next as ResearchMode })}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 min-w-[9rem] px-2 text-xs">
          <SelectValue placeholder={t('research.toggle.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {RESEARCH_MODES.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
