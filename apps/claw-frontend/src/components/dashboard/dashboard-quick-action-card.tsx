import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import type { DashboardQuickActionCardProps } from '@/types';

export function DashboardQuickActionCard({
  action,
}: DashboardQuickActionCardProps): React.ReactElement {
  const { t } = useTranslation();
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      aria-label={t(action.label)}
      className="group focus-visible:ring-ring rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <Card variant="interactive" className="h-full">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-primary/12 text-primary duration-normal ease-quint-out flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110">
              <Icon className="h-5 w-5" />
            </span>
            <CardTitle className="text-base font-semibold [overflow-wrap:anywhere]">
              {t(action.label)}
            </CardTitle>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="text-muted-foreground duration-normal ease-quint-out group-hover:text-primary h-5 w-5 shrink-0 transition-all group-hover:translate-x-0.5"
          />
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">{t(action.description)}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
