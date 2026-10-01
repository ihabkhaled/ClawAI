import { FeedbackType } from '@claw/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import {
  publicFeedbackFormSchema,
  type PublicFeedbackFormValues,
} from '@/lib/validation/feedback-public.schema';
import { feedbackPublicRepository } from '@/repositories/feedback/feedback-public.repository';
import type { FeedbackPageContext } from '@/types';
import type { UsePublicFeedbackFormReturn } from '@/types/feedback-hook.types';
import { publicFeedbackErrorKey } from '@/utilities/feedback-error-key.utility';

// The typed name and email live only in this form's memory. They are never
// written to storage and never logged.
export function usePublicFeedbackForm(onSubmitted: () => void): UsePublicFeedbackFormReturn {
  const form = useForm<PublicFeedbackFormValues>({
    resolver: zodResolver(publicFeedbackFormSchema),
    defaultValues: {
      type: FeedbackType.GENERAL_FEEDBACK,
      title: '',
      contentMarkdown: '',
      name: '',
      email: '',
      website: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (input: { values: PublicFeedbackFormValues; pageContext: FeedbackPageContext }) =>
      feedbackPublicRepository.create({
        type: input.values.type,
        ...(input.values.title === undefined || input.values.title === ''
          ? {}
          : { title: input.values.title }),
        message: input.values.contentMarkdown,
        name: input.values.name,
        email: input.values.email,
        pageUrl: input.pageContext.url ?? '',
        locale: input.pageContext.locale ?? '',
        website: input.values.website,
      }),
    onSuccess: () => {
      onSubmitted();
      form.reset();
    },
  });

  // Guarded so a double click cannot send two messages.
  const submit = (pageContext: FeedbackPageContext): void => {
    if (mutation.isPending) {
      return;
    }
    void form.handleSubmit((values) => {
      mutation.mutate({ values, pageContext });
    })();
  };

  return {
    form,
    submit,
    isSubmitting: mutation.isPending,
    submitErrorKey: mutation.error === null ? null : publicFeedbackErrorKey(mutation.error),
  };
}
