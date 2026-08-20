'use client';

import { Home } from 'lucide-react';
import Link from 'next/link';

import { MarketingLocaleSwitcher } from '@/components/marketing/marketing-locale-switcher';
import { MarketingThemeToggle } from '@/components/marketing/marketing-theme-toggle';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export function AuthTopControls(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="relative z-20 flex items-center justify-end gap-1 p-4 pt-[max(1rem,env(safe-area-inset-top))] lg:absolute lg:end-4 lg:top-4 lg:p-0">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/" aria-label={t('auth.backToHome')}>
          <Home className="h-4 w-4" />
        </Link>
      </Button>
      <MarketingLocaleSwitcher />
      <MarketingThemeToggle />
    </div>
  );
}
