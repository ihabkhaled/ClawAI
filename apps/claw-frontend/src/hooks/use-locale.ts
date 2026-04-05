import { useContext } from 'react';

import { LocaleContext } from '@/lib/i18n/locale-context';
import type { LocaleContextValue } from '@/types/i18n.types';

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);

  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }

  return context;
}
