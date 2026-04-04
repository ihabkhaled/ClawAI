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
