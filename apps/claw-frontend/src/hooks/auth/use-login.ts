import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants";
import { authService } from "@/services/auth/auth.service";
import type { LoginRequest } from "@/types";

export function useLogin() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: () => {
      router.push(ROUTES.CHAT);
    },
  });

  return {
    login: mutation.mutate,
    loginAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
