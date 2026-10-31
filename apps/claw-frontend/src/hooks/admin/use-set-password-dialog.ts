'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import { PasswordSetMode } from '@/enums/password-set-mode.enum';
import { adminUserPasswordSchema } from '@/lib/validation/admin-user-password.schema';
import type {
  AdminUser,
  PasswordFormValues,
  SetUserPasswordRequest,
  SetUserPasswordResponse,
  UseSetPasswordDialogReturn,
} from '@/types';

/**
 * State of the set-password dialog. A generated password is held in React state
 * only - it is shown once, copied by the admin, and dropped on `reset`. It is
 * never written to storage, a query cache or a log.
 */
export function useSetPasswordDialog(
  user: AdminUser | null,
  onConfirm: (
    userId: string,
    data: SetUserPasswordRequest,
  ) => Promise<SetUserPasswordResponse | null>,
  onManualDone: () => void,
): UseSetPasswordDialogReturn {
  const [mode, setMode] = useState<PasswordSetMode>(PasswordSetMode.GENERATE);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(adminUserPasswordSchema),
    mode: 'onChange',
    defaultValues: { password: '' },
  });

  const reset = useCallback((): void => {
    setGeneratedPassword(null);
    setIsDone(false);
    setMode(PasswordSetMode.GENERATE);
    form.reset({ password: '' });
  }, [form]);

  const generate = async (): Promise<void> => {
    if (!user) {
      return;
    }
    const result = await onConfirm(user.id, { mode: PasswordSetMode.GENERATE });
    if (result?.generatedPassword !== undefined) {
      setGeneratedPassword(result.generatedPassword);
      setIsDone(true);
    }
  };

  const setManually = form.handleSubmit(async (values) => {
    if (!user) {
      return;
    }
    const result = await onConfirm(user.id, {
      mode: PasswordSetMode.MANUAL,
      password: values.password,
    });
    if (result !== null) {
      form.reset({ password: '' });
      onManualDone();
    }
  });

  const submit = async (event?: React.BaseSyntheticEvent): Promise<void> => {
    if (mode === PasswordSetMode.GENERATE) {
      event?.preventDefault();
      await generate();
      return;
    }
    await setManually(event);
  };

  return { mode, setMode, form, generatedPassword, isDone, submit, reset };
}
