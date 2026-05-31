'use client';

import { useTranslation } from '@/lib/i18n';

// Accessibility primitive: the first focusable element on every portal page.
// It is visually hidden until it receives keyboard focus (Tab from the URL
// bar), at which point it slides into view in the top-left corner and lets
// the user jump directly to <main id="main-content"> — skipping the entire
// sidebar / topbar navigation. WCAG 2.4.1 (Bypass Blocks).
export function SkipToContent(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <a
      href="#main-content"
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground focus-visible:shadow-floating focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {t('accessibility.skipToContent')}
    </a>
  );
}
