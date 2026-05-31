import { Activity, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { RecentAuditEventsBody } from '@/components/admin/recent-audit-events-body';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/constants';
import { useRecentAuditEvents } from '@/hooks/admin/use-recent-audit-events';
import { useTranslation } from '@/lib/i18n';

// Recent audit events panel rendered at the bottom of the admin overview.
// Pulls the last 10 events via useRecentAuditEvents and links the header
// to the full /audits page. Loading / error / empty / list selection
// lives in RecentAuditEventsBody so this file is pure composition.
export function RecentAuditEvents(): React.ReactElement {
  const { t } = useTranslation();
  const { events, isLoading, isError } = useRecentAuditEvents();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-lg">{t('admin.recentAuditEventsTitle')}</CardTitle>
          </div>
          <CardDescription>{t('admin.recentAuditEventsDescription')}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.AUDITS} className="flex items-center gap-1">
            <span>{t('admin.viewAllAudits')}</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <RecentAuditEventsBody
          isLoading={isLoading}
          isError={isError}
          events={events}
          t={t}
        />
      </CardContent>
    </Card>
  );
}
