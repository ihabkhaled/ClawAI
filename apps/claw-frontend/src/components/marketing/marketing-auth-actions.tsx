'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { MarketingAuthActionsVariant } from '@/enums';
import { useIsSignedIn } from '@/hooks/auth/use-is-signed-in';
import { useLogout } from '@/hooks/auth/use-logout';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MarketingAuthActionsProps } from '@/types';

// Register / Sign in for a visitor, a Chat entry for a signed-in user.
//
// The page is static and public, so the server and the first client render
// always carry the signed-out version (this is also what a crawler reads). The
// session is checked after hydration from the token the app already stores;
// nothing is fetched. On desktop both versions share one grid cell: the
// signed-out pair keeps its width (invisible, out of the tab order and the
// accessibility tree) while Chat takes its place, so the bar does not shift.
export function MarketingAuthActions({
  variant,
  onNavigate,
}: MarketingAuthActionsProps): React.ReactElement {
  const { t } = useTranslation();
  const isSignedIn = useIsSignedIn();
  // Same logout as the portal user menu; null = stay on this public page.
  const { logout, isPending } = useLogout(null);
  const logoutLabel = isPending ? t('common.loading') : t('auth.logout');

  if (variant === MarketingAuthActionsVariant.MOBILE) {
    return isSignedIn ? (
      <>
        <Button asChild onClick={onNavigate}>
          <Link href={ROUTES.CHAT}>{t('nav.chat')}</Link>
        </Button>
        <Button variant="outline" disabled={isPending} onClick={() => logout()}>
          {logoutLabel}
        </Button>
      </>
    ) : (
      <>
        <Button variant="outline" asChild onClick={onNavigate}>
          <Link href={ROUTES.LOGIN}>{t('marketing.header.login')}</Link>
        </Button>
        <Button asChild onClick={onNavigate}>
          <Link href={ROUTES.REGISTER}>{t('marketing.header.createAccount')}</Link>
        </Button>
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 items-center">
      <div
        aria-hidden={isSignedIn}
        className={cn('col-start-1 row-start-1 flex items-center gap-1', isSignedIn && 'invisible')}
      >
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.LOGIN}>{t('marketing.header.login')}</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href={ROUTES.REGISTER}>{t('marketing.header.createAccount')}</Link>
        </Button>
      </div>
      {isSignedIn ? (
        <div className="col-start-1 row-start-1 flex items-center justify-end gap-1">
          <Button size="sm" asChild>
            <Link href={ROUTES.CHAT}>{t('nav.chat')}</Link>
          </Button>
          <Button variant="ghost" size="sm" disabled={isPending} onClick={() => logout()}>
            {logoutLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
