import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { ROUTES } from '@/constants';
import { REMEMBERED_EMAIL_STORAGE_KEY } from '@/constants/login.constants';
import { useLogin } from '@/hooks/auth/use-login';
import { useTranslation } from '@/lib/i18n';
import { loginSchema } from '@/lib/validation/login.schema';
import type { LoginFormValues } from '@/lib/validation/login.schema';
import type { UseLoginFormReturn } from '@/types/hook.types';

// Controller hook for the login page. Owns:
//   1. the react-hook-form instance + submit handler
//   2. show/hide password toggle local state
//   3. remember-me toggle + localStorage persistence of the email only
//   4. forgot-password placeholder click handler (coming-soon toast)
// The .tsx component contains zero hook calls and zero logic — it consumes
// this hook and renders.
export function useLoginForm(): UseLoginFormReturn {
  const { t } = useTranslation();
  const { login, isPending, isError, error } = useLogin();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // On mount: hydrate the email field from localStorage if the user
  // previously opted in. Guard SSR: localStorage is only defined in the
  // browser. This runs once per mount; form.reset is stable.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const remembered = window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY);
      if (remembered !== null && remembered.length > 0) {
        form.reset({ email: remembered, password: '' });
        setRememberMe(true);
      }
    } catch {
      // localStorage can throw in private mode or with a full quota.
      // Silently fall back to the empty default state — login still works.
    }
  }, [form]);

  const togglePasswordVisibility = (): void => {
    setShowPassword((prev) => !prev);
  };

  const handleRememberMeChange = (checked: boolean): void => {
    setRememberMe(checked);
  };

  const handleForgotPasswordClick = (): void => {
    // Phase 4 placeholder — surface a coming-soon toast instead of a
    // 404 link. Forgot-password flow is tracked separately on the
    // product backlog.
    router.push(ROUTES.FORGOT_PASSWORD);
  };

  const onSubmit = (data: LoginFormValues): void => {
    // Persist the email iff remember-me is on. Never persist the password.
    if (typeof window !== 'undefined') {
      try {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, data.email);
        } else {
          window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
        }
      } catch {
        // Same private-mode fallback — don't block the login.
      }
    }
    login(data);
  };

  return {
    form,
    showPassword,
    togglePasswordVisibility,
    rememberMe,
    handleRememberMeChange,
    handleForgotPasswordClick,
    onSubmit: form.handleSubmit(onSubmit),
    isPending,
    isError,
    errorMessage: error?.message ?? null,
    t,
  };
}
