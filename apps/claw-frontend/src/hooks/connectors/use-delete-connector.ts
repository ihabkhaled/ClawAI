import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants";
import { connectorRepository } from "@/repositories/connectors/connector.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useDeleteConnector() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (id: string) => connectorRepository.deleteConnector(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.connectors.lists(),
      });
      router.push(ROUTES.CONNECTORS);
    },
  });

  return {
    deleteConnector: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
