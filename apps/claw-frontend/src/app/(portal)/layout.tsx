import type { Metadata } from 'next';

import { PortalShell } from '@/components/layout/portal-shell';

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

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <PortalShell>{children}</PortalShell>;
}
