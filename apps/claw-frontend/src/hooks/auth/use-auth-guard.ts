"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ROUTES } from "@/constants";
import { useAuthStore } from "@/stores/auth.store";

export function useAuthGuard(): { isReady: boolean } {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isAuthenticated, accessToken, router]);

  return { isReady: isAuthenticated && !!accessToken };
}
