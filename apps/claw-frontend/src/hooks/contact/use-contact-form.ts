import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { CONTACT_ERROR_MESSAGE_KEYS } from '@/constants/contact.constants';
import { ContactResponseCode } from '@/enums/contact-response-code.enum';
import { useTranslation } from '@/lib/i18n';
import { contactSchema } from '@/lib/validation/contact.schema';
import type { ContactFormValues } from '@/lib/validation/contact.schema';
import { ContactSubmitError, contactRepository } from '@/repositories/contact/contact.repository';
import type { UseContactFormReturn } from '@/types/contact.types';
import { showToast } from '@/utilities';

// Controller hook for the contact page: form state, timing guard, submission,
// and success/error surfacing (toast + banner). The .tsx renders only.
export function useContactForm(): UseContactFormReturn {
  const { t } = useTranslation();
  const mountedAt = useRef<number>(Date.now());
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorCode, setErrorCode] = useState<ContactResponseCode | null>(null);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '', company: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: ContactFormValues) => contactRepository.submit(values),
    onSuccess: () => {
      setErrorCode(null);
      setIsSuccess(true);
      form.reset();
      showToast.success({ title: t('marketing.contact.successTitle') });
    },
    onError: (error: unknown) => {
      const code = error instanceof ContactSubmitError ? error.code : ContactResponseCode.ERROR;
      setErrorCode(code);
      showToast.error({
        title: t(CONTACT_ERROR_MESSAGE_KEYS[code] ?? 'marketing.contact.errorGeneric'),
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate({ ...values, elapsedMs: Date.now() - mountedAt.current });
  });

  const resetSuccess = useCallback(() => setIsSuccess(false), []);

  return {
    form,
    onSubmit,
    isPending: mutation.isPending,
    isSuccess,
    errorCode,
    resetSuccess,
    t,
  };
}
