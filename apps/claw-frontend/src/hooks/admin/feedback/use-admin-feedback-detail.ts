import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { feedbackAdminRepository } from '@/repositories/feedback/feedback-admin.repository';
import type { FeedbackTicket } from '@/types';

export function useAdminFeedbackDetail(id: string | null) {
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useQuery<FeedbackTicket>({
    queryKey: ['admin-feedback-detail', id],
    queryFn: () => feedbackAdminRepository.get(id ?? ''),
    enabled: id !== null,
  });

  const {
    mutate: changeStatus,
    isPending: isChanging,
    error: changeError,
  } = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) => {
      if (id === null) {
        throw new Error('No ticket selected');
      }
      return feedbackAdminRepository.updateStatus(id, status, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-list'] });
    },
  });

  return {
    ticket,
    isLoading,
    changeStatus,
    isChanging,
    changeError,
  };
}
