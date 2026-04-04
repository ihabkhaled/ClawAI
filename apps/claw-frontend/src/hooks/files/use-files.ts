import { useQuery } from "@tanstack/react-query";

import { filesRepository } from "@/repositories/files/files.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useFiles(filters: Record<string, unknown> = {}) {
  const params: Record<string, string> = {};
  if (filters["ingestionStatus"] !== undefined) {
    params["ingestionStatus"] = String(filters["ingestionStatus"]);
  }

  const query = useQuery({
    queryKey: queryKeys.files.list(filters),
    queryFn: () => filesRepository.getFiles(params),
  });

  return {
    files: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
