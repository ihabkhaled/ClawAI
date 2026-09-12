import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useRegister } from '@/hooks/auth/use-register';
import { useTranslation } from '@/lib/i18n';
import { registerSchema } from '@/lib/validation/register.schema';
import type { RegisterFormValues } from '@/lib/validation/register.schema';
import type { UseRegisterFormReturn } from '@/types/hook.types';
import { localeToLanguage } from '@/utilities';

export function useRegisterForm(): UseRegisterFormReturn {
  const { t, locale } = useTranslation();
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
    register({
      ...request,
      ...(phone ? { phone } : {}),
      // The language the form was filled in, sent so the confirmation email —
      // the one standing between this user and their first sign-in — arrives
      // in it. There is no session yet for the server to read a preference
      // from, so if the client does not say, it defaults to English.
      languagePreference: localeToLanguage(locale),
    });
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
