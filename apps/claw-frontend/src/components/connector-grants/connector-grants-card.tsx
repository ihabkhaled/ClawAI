'use client';

import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkspaceConnectorAccessLevel } from '@/enums/workspace-connector-access-level.enum';
import { useConnectorGrantsCard } from '@/hooks/connector-grants/use-connector-grants-card';
import type { ConnectorGrantsCardProps } from '@/types/connector-grants-card-props.types';

export function ConnectorGrantsCard({
  connectorId,
  labels,
}: ConnectorGrantsCardProps): ReactElement {
  const ctrl = useConnectorGrantsCard(connectorId);

  const levelLabel = (lvl: WorkspaceConnectorAccessLevel): string => {
    if (lvl === WorkspaceConnectorAccessLevel.READ_ONLY) {
      return labels.levelReadOnly;
    }
    if (lvl === WorkspaceConnectorAccessLevel.AI_ACTIONS) {
      return labels.levelAiActions;
    }
    return labels.levelFull;
  };

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">{labels.title}</h3>
        <p className="text-xs text-muted-foreground">{labels.description}</p>
      </div>

      {ctrl.isLoading ? (
        <p className="text-xs text-muted-foreground">{labels.loading}</p>
      ) : null}

      {ctrl.isError ? (
        <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {ctrl.error?.message ?? labels.error}
        </p>
      ) : null}

      {!ctrl.isLoading && !ctrl.isError && ctrl.grants.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.empty}</p>
      ) : null}

      {ctrl.grants.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {ctrl.grants.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{g.userId}</span>
                <span className="text-xs text-muted-foreground">
                  {labels.grantedBy}: {g.grantedBy}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{levelLabel(g.accessLevel)}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={ctrl.pendingGranteeId === g.userId}
                  onClick={() => void ctrl.revoke(g.userId)}
                >
                  {ctrl.pendingGranteeId === g.userId ? labels.revoking : labels.revoke}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" htmlFor="grantee-user-id">
            {labels.granteeUserIdLabel}
          </label>
          <Input
            id="grantee-user-id"
            value={ctrl.granteeUserId}
            placeholder={labels.granteeUserIdPlaceholder}
            maxLength={128}
            onChange={(e) => ctrl.setGranteeUserId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">{labels.accessLevelLabel}</label>
          <Select
            value={ctrl.accessLevel}
            onValueChange={(value) =>
              ctrl.setAccessLevel(value as WorkspaceConnectorAccessLevel)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={WorkspaceConnectorAccessLevel.READ_ONLY}>
                {labels.levelReadOnly}
              </SelectItem>
              <SelectItem value={WorkspaceConnectorAccessLevel.AI_ACTIONS}>
                {labels.levelAiActions}
              </SelectItem>
              <SelectItem value={WorkspaceConnectorAccessLevel.FULL}>
                {labels.levelFull}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {ctrl.mutationError !== null ? (
          <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {ctrl.mutationError.message}
          </p>
        ) : null}
        <Button
          onClick={() => void ctrl.submitGrant()}
          disabled={ctrl.isGranting || ctrl.granteeUserId.trim().length === 0}
        >
          {ctrl.isGranting ? labels.granting : labels.grant}
        </Button>
      </div>
    </Card>
  );
}
