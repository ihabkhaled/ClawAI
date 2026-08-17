import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useRegister } from '@/hooks/auth/use-register';
import { useTranslation } from '@/lib/i18n';
import { registerSchema } from '@/lib/validation/register.schema';
import type { RegisterFormValues } from '@/lib/validation/register.schema';
import type { UseRegisterFormReturn } from '@/types/hook.types';

export function useRegisterForm(): UseRegisterFormReturn {
  const { t } = useTranslation();
  const { register, isPending, isError, error } = useRegister();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const submit = (values: RegisterFormValues): void => {
    const { confirmPassword: _confirmPassword, phone, ...request } = values;
    register({ ...request, ...(phone ? { phone } : {}) });
  };

  return {
    form,
    onSubmit: form.handleSubmit(submit),
    isPending,
    isError,
    errorMessage: error?.message ?? null,
    t,
  };
}
