import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants";
import { authService } from "@/services/auth/auth.service";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      queryClient.clear();
      router.push(ROUTES.LOGIN);
    },
  });

  return {
    logout: mutation.mutate,
    isPending: mutation.isPending,
  };
}
