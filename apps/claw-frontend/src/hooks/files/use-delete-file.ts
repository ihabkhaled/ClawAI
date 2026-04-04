import { useMutation, useQueryClient } from "@tanstack/react-query";

import { filesRepository } from "@/repositories/files/files.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useDeleteFile() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => filesRepository.deleteFile(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.files.lists(),
      });
    },
  });

  return {
    deleteFile: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
