import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// The Board is behind login and never indexed; the portal layout also sets
// noindex, repeated here so the rule survives a layout move.
export const metadata: Metadata = {
  title: 'Board',
  robots: { index: false, follow: false, nocache: true },
};

export default function BoardLayout({ children }: { children: ReactNode }): ReactNode {
  return children;
}
