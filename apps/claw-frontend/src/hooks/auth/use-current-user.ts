import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/repositories/shared/query-keys";
import { authService } from "@/services/auth/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storedUser = useAuthStore((state) => state.user);

  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authService.getCurrentUser(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    user: query.data ?? storedUser,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
