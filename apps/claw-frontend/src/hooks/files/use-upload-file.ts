import { useMutation, useQueryClient } from "@tanstack/react-query";

import { filesRepository } from "@/repositories/files/files.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type { UploadFileRequest } from "@/types";

export function useUploadFile() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UploadFileRequest) =>
      filesRepository.uploadFile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.files.lists(),
      });
    },
  });

  return {
    uploadFile: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
