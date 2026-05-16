import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from '@/repositories/workspace/email-template.repository';
import type {
  CreateEmailTemplateRequest,
  EmailTemplate,
  UpdateEmailTemplateRequest,
} from '@/types/email-template.types';

export function useEmailTemplatesQuery(): UseQueryResult<EmailTemplate[], Error> {
  return useQuery({
    queryKey: queryKeys.emailTemplates.list(),
    queryFn: listEmailTemplates,
    staleTime: 30_000,
  });
}

export function useCreateEmailTemplate(): UseMutationResult<
  EmailTemplate,
  Error,
  CreateEmailTemplateRequest
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.emailTemplates.all });
    },
  });
}

export function useUpdateEmailTemplate(): UseMutationResult<
  EmailTemplate,
  Error,
  { id: string; payload: UpdateEmailTemplateRequest }
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateEmailTemplate(id, payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.emailTemplates.all });
    },
  });
}

export function useDeleteEmailTemplate(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.emailTemplates.all });
    },
  });
}
