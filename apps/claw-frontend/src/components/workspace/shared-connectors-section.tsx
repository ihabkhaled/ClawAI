'use client';

import { Share2 } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/constants';
import { WorkspaceConnectorAccessLevel } from '@/enums/workspace-connector-access-level.enum';
import type { SharedConnectorsSectionProps } from '@/types/component.types';

export function SharedConnectorsSection({
  connectors,
  isLoading,
  isError,
  t,
}: SharedConnectorsSectionProps): React.ReactElement | null {
  if (isLoading || isError || connectors.length === 0) {
    return null;
  }

  const levelLabel = (level: WorkspaceConnectorAccessLevel): string => {
    if (level === WorkspaceConnectorAccessLevel.READ_ONLY) {
      return t('connectorGrants.levelReadOnly');
    }
    if (level === WorkspaceConnectorAccessLevel.AI_ACTIONS) {
      return t('connectorGrants.levelAiActions');
    }
    return t('connectorGrants.levelFull');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Share2 className="text-muted-foreground size-4" />
        <h2 className="text-base font-semibold">{t('sharedConnectors.title')}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {connectors.map((shared) => (
          <Card key={shared.connectorId}>
            <CardContent className="flex flex-col gap-2 p-4">
              <Link
                href={ROUTES.WORKSPACE_CONNECTOR_DETAIL(shared.connectorId)}
                className="truncate text-sm font-medium hover:underline"
              >
                {shared.connectorName}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {shared.provider}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {levelLabel(shared.accessLevel)}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                {t('sharedConnectors.sharedBy', { value: shared.grantedBy })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
