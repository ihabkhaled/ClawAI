'use client';

import { useCallback, useState } from 'react';

import { PasswordInputType } from '@/enums/password-input-type.enum';
import type { UsePasswordVisibilityReturn } from '@/types/hook.types';

export function usePasswordVisibility(): UsePasswordVisibilityReturn {
  const [visible, setVisible] = useState<boolean>(false);

  const toggle = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  const inputType = visible ? PasswordInputType.TEXT : PasswordInputType.PASSWORD;

  return { visible, toggle, inputType };
}
