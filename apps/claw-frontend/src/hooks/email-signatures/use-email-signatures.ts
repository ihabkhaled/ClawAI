import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import {
  createEmailSignature,
  deleteEmailSignature,
  listEmailSignatures,
  updateEmailSignature,
} from '@/repositories/workspace/email-signature.repository';
import type {
  CreateEmailSignatureRequest,
  EmailSignature,
  UpdateEmailSignatureRequest,
} from '@/types/email-signature.types';

export function useEmailSignaturesQuery(): UseQueryResult<EmailSignature[], Error> {
  return useQuery({
    queryKey: queryKeys.emailSignatures.list(),
    queryFn: listEmailSignatures,
    staleTime: 30_000,
  });
}

export function useCreateEmailSignature(): UseMutationResult<
  EmailSignature,
  Error,
  CreateEmailSignatureRequest
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createEmailSignature,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.emailSignatures.all });
    },
  });
}

export function useUpdateEmailSignature(): UseMutationResult<
  EmailSignature,
  Error,
  { id: string; payload: UpdateEmailSignatureRequest }
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateEmailSignature(id, payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.emailSignatures.all });
    },
  });
}

export function useDeleteEmailSignature(): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteEmailSignature,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.emailSignatures.all });
    },
  });
}
