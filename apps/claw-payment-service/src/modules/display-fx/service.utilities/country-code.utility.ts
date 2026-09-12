// Normalizes a country code that arrived from a client hint or a saved
// preference. Shape only — whether the country is one ClawAI maps to a currency
// is `resolveCountryDisplayCurrency`'s job, and keeping the two apart means a
// newly-mapped country needs no change here.
export function normalizeCountryCode(candidate: string | null | undefined): string | null {
  if (candidate === null || candidate === undefined) {
    return null;
  }
  const normalized = candidate.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}
