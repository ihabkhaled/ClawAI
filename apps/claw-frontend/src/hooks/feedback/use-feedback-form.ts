import { FeedbackType } from '@claw/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { feedbackFormSchema, type FeedbackFormValues } from '@/lib/validation/feedback.schema';
import { feedbackRepository } from '@/repositories/feedback/feedback.repository';
import type { FeedbackAttachment, FeedbackPageContext } from '@/types';
import type { UseFeedbackFormReturn } from '@/types/feedback-hook.types';

export function useFeedbackForm(
  onSubmitted: (ticketNumber: string) => void,
): UseFeedbackFormReturn {
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      type: FeedbackType.BUG_REPORT,
      title: '',
      subject: '',
      contentMarkdown: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (
      values: FeedbackFormValues & {
        attachments: FeedbackAttachment[];
        pageContext: FeedbackPageContext;
      },
    ) => feedbackRepository.create(values),
    onSuccess: (response) => {
      onSubmitted(response.ticketNumber);
      form.reset();
    },
  });

  // Guarded so a double click cannot create two tickets.
  const submit = (attachments: FeedbackAttachment[], pageContext: FeedbackPageContext): void => {
    if (mutation.isPending) {
      return;
    }
    void form.handleSubmit((values) => {
      mutation.mutate({ ...values, attachments, pageContext });
    })();
  };

  return {
    form,
    submit,
    isSubmitting: mutation.isPending,
    submitError: mutation.error === null ? null : 'feedback.errors.submitFailed',
  };
}
