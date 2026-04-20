import type { ReactElement } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { AVAILABLE_CONNECT_SCOPES } from '@/constants/device.constants';
import type { DeviceScope } from '@/enums';
import type { ScopeCheckboxListProps } from '@/types/device-component.types';

export function ScopeCheckboxList({
  value,
  onChange,
  disabled = false,
}: ScopeCheckboxListProps): ReactElement {
  const toggle = (scope: DeviceScope): void => {
    onChange(value.includes(scope) ? value.filter((s) => s !== scope) : [...value, scope]);
  };
  return (
    <ul className="space-y-2">
      {AVAILABLE_CONNECT_SCOPES.map((scope) => (
        <li key={scope} className="flex items-center gap-3">
          <Checkbox
            id={`scope-${scope}`}
            checked={value.includes(scope)}
            onCheckedChange={() => toggle(scope)}
            disabled={disabled}
          />
          <label htmlFor={`scope-${scope}`} className="font-mono text-sm">
            {scope}
          </label>
        </li>
      ))}
    </ul>
  );
}
