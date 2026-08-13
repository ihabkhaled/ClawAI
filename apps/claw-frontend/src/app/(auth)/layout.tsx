import type { Metadata } from 'next';

import { AuthAppVersion } from '@/components/auth/auth-app-version';

// Login/registration are never indexable — they carry no unique public
// content and must not appear in search results. See src/middleware.ts for
// the matching X-Robots-Tag header enforcement.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="relative min-h-dvh">
      {children}
      <AuthAppVersion />
    </div>
  );
}
