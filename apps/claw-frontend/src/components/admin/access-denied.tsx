import { ShieldOff } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import type { AccessDeniedProps } from '@/types';

// Friendly access-denied splash for admin-gated pages. Renders a centered
// lucide illustration + clear messaging + a back-to-dashboard CTA so the
// user is never stranded on a blank screen. Used by /admin and (in future
// iterations) every AdminGuard fallback.
export function AccessDenied({ t }: AccessDeniedProps): React.ReactElement {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldOff className="h-10 w-10" aria-hidden="true" />
      </div>
      <h2 className="mt-6 text-xl font-semibold tracking-tight sm:text-2xl">
        {t('common.accessDeniedTitle')}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {t('common.accessDeniedBody')}
      </p>
      <Button asChild className="mt-6">
        <Link href={ROUTES.DASHBOARD}>{t('common.backToDashboard')}</Link>
      </Button>
    </div>
  );
}
