import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { PortalShell } from '@/components/layout/portal-shell';
import { DisplayCurrencyProvider } from '@/lib/display-currency/display-currency-context';
import { fetchDisplayCurrencyContext } from '@/lib/display-currency/fetch-display-currency-context';

// Server component: owns route metadata only. The entire authenticated
// shell (hooks, auth gate, interactive chrome) lives in the client
// component PortalShell — a client component cannot export `metadata`,
// so the noindex directive below is only enforceable from a server layout.
// See src/middleware.ts for the corresponding X-Robots-Tag header, which
// enforces the same rule at the response-header level (never rely on
// metadata exports alone).
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // Resolved here, on the server, for the same reason the marketing layout does
  // it: a billing page that renders dollars and then swaps to EGP is worse than
  // one that was right the first time. A null context renders canonical USD.
  const displayCurrency = await fetchDisplayCurrencyContext(await headers());

  return (
    <DisplayCurrencyProvider initialContext={displayCurrency}>
      <PortalShell>{children}</PortalShell>
    </DisplayCurrencyProvider>
  );
}
