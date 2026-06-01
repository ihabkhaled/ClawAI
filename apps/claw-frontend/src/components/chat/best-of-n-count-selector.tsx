import { Sigma } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BEST_OF_N_COUNT_OPTIONS } from '@/constants/best-of-n.constants';
import type { BestOfNCountSelectorProps } from '@/types';

// Small numeric selector for the Best-of-N "candidates (N)" field.
//
// Rendered inside the OrchestrationPageShell's `extraFieldsSlot` so the
// host page stays pure render composition (no inline sub-component, no
// inline option arrays). The option list is sourced from a constants
// file so we never re-allocate the array on every render.
export function BestOfNCountSelector({
  value,
  onChange,
  disabled,
  t,
}: BestOfNCountSelectorProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground" htmlFor="best-of-n-count">
        {t('bestOfN.nCandidates')}
      </label>
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
        disabled={disabled}
      >
        <SelectTrigger id="best-of-n-count" className="w-full">
          <Sigma className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BEST_OF_N_COUNT_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {String(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{t('bestOfN.candidateCountHelper')}</p>
    </div>
  );
}
