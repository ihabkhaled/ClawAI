import { API_BASE_URL } from "@/constants";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = localStorage.getItem("claw-auth-storage");
    if (!stored) {
      return null;
    }
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "state" in parsed
    ) {
      const state = (parsed as { state: { accessToken?: string } }).state;
      return state.accessToken ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
