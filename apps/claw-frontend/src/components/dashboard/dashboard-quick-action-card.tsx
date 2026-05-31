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
      className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card variant="interactive" className="h-full">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary transition-transform duration-normal ease-quint-out group-hover:scale-110">
              <Icon className="h-5 w-5" />
            </span>
            <CardTitle className="truncate text-base font-semibold">{t(action.label)}</CardTitle>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-muted-foreground transition-all duration-normal ease-quint-out group-hover:translate-x-0.5 group-hover:text-primary"
          />
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">{t(action.description)}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
