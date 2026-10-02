import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { ROUTES } from '@/constants';
import { useRegister } from '@/hooks/auth/use-register';
import { useTranslation } from '@/lib/i18n';
import { registerSchema } from '@/lib/validation/register.schema';
import type { RegisterFormValues } from '@/lib/validation/register.schema';
import type { UseRegisterFormReturn } from '@/types/hook.types';
import { localeToLanguage, showToast } from '@/utilities';
import { copyTextToClipboard } from '@/utilities/clipboard.utility';
import {
  classifySignupFailure,
  evaluatePasswordRules,
  readSignupRequestId,
  resolveSignupFailureCopy,
  resolveSignupFieldErrors,
} from '@/utilities/signup-failure.utility';

// Controller for the register form. Owns validation (client zod schema, live
// once a field has been touched), the ONE failure explanation the form shows,
// server field errors pinned to their fields, and the live password checklist.
export function useRegisterForm(): UseRegisterFormReturn {
  const { t, locale } = useTranslation();
  const { register, isPending, isError, error } = useRegister();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    // Format problems surface as soon as the user leaves a field, and clear as
    // soon as they fix it — not only after pressing the button.
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  // A field the API refused is marked on that field, in the reader's language.
  // `type: 'server'` lets the phone row tell these apart from the live
  // format check PhoneInput already shows.
  useEffect(() => {
    if (error === null) {
      return;
    }
    for (const fieldError of resolveSignupFieldErrors(error)) {
      form.setError(fieldError.field, { type: 'server', message: fieldError.messageKey });
    }
  }, [error, form]);

  const password = form.watch('password');
  const passwordRules = useMemo(() => evaluatePasswordRules(password), [password]);

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

  // The backend message is never shown (rule 43 §2): the code picks the copy.
  const failureCopy = isError ? resolveSignupFailureCopy(classifySignupFailure(error)) : null;
  const requestId = failureCopy?.showsRequestId === true ? readSignupRequestId(error) : null;

  const copyRequestId = (): void => {
    if (requestId === null) {
      return;
    }
    void copyTextToClipboard(requestId).then((copied) => {
      if (copied) {
        showToast.success({ title: t('auth.signup.requestIdCopied') });
      }
    });
  };

  const phoneError = form.formState.errors.phone;

  return {
    form,
    onSubmit: form.handleSubmit(submit),
    isPending,
    failureCopy,
    requestId,
    copyRequestId,
    passwordRules,
    phoneServerErrorKey: phoneError?.type === 'server' ? (phoneError.message ?? null) : null,
    signInHref: ROUTES.LOGIN,
    resetPasswordHref: ROUTES.FORGOT_PASSWORD,
    t,
  };
}
