'use client';

import { Home } from 'lucide-react';
import Link from 'next/link';

import { MarketingLocaleSwitcher } from '@/components/marketing/marketing-locale-switcher';
import { MarketingThemeToggle } from '@/components/marketing/marketing-theme-toggle';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

// Public-page controls shown in the top corner of the login/register screens:
// a link back to the marketing home, the language switcher, and the theme
// toggle. Reuses the public-safe marketing switchers (no authenticated
// mutation) since these pages are unauthenticated. Positioned by the parent.
export function AuthTopControls(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="absolute end-4 top-4 z-20 flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
        <Link href="/" aria-label={t('auth.backToHome')}>
          <Home className="h-4 w-4" />
        </Link>
      </Button>
      <MarketingLocaleSwitcher />
      <MarketingThemeToggle />
    </div>
  );
}
