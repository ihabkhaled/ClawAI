'use client';

import { CheckCircle, Shield, XCircle } from 'lucide-react';
import type { ReactElement } from 'react';

import { RiskBadge } from '@/components/agent/risk-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAgentCapabilitiesPage } from '@/hooks/agent/use-agent-capabilities-page';
import { useTranslation } from '@/lib/i18n';

export function CapabilityInvocationsSection(): ReactElement | null {
  const { t } = useTranslation();
  const { pending, isLoading, isError, handleApprove, handleReject, isApproving } =
    useAgentCapabilitiesPage();

  if (isError || isLoading) {
    return null;
  }
  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Shield className="size-4 text-yellow-500" />
        {t('agent.capabilities')} ({pending.length})
      </h2>
      {pending.map((inv) => (
        <Card key={inv.id} className="border-yellow-300/50">
          <CardContent className="flex items-center gap-3 py-3">
            <Badge variant="outline" className="font-mono text-xs">
              {inv.capabilityClass}.{inv.capabilityOperation}
            </Badge>
            <RiskBadge label={inv.riskLabel} score={inv.riskScore} />
            <code className="flex-1 truncate text-xs text-muted-foreground">
              {JSON.stringify(inv.targetDescriptor)}
            </code>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={isApproving}
                onClick={() => handleApprove(inv.id)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
              >
                <CheckCircle className="size-3" />
                {t('agent.approve')}
              </button>
              <button
                type="button"
                onClick={() => handleReject(inv.id, t('agent.rejectedByUser'))}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                <XCircle className="size-3" />
                {t('agent.reject')}
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
