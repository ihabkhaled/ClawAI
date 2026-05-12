'use client';

import { X } from 'lucide-react';
import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouterModelDetail } from '@/hooks/routing/use-router-model-detail';
import { useRouterModelOverrides } from '@/hooks/routing/use-router-model-overrides';
import type {
  RouterModelDetailDrawerProps,
  RouterModelDetailRowProps,
} from '@/types/router-model-components.types';
import type { RouterAdminOverride } from '@/types/router-models.types';

export function RouterModelDetailDrawer({
  modelId,
  onClose,
}: RouterModelDetailDrawerProps): ReactElement | null {
  const detail = useRouterModelDetail(modelId);
  const overrides = useRouterModelOverrides(modelId);

  if (modelId === null) {
    return null;
  }

  const model = detail.data;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-[480px] overflow-y-auto border-l border-border bg-background shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">{model?.displayName ?? 'Loading…'}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 p-4">
        <DrawerBody
          isLoading={detail.isLoading}
          isError={detail.isError}
          hasModel={model !== undefined}
        />
        {!detail.isLoading && !detail.isError && model !== undefined ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Provider" value={model.provider} />
                <Row label="Model key" value={model.modelKey} />
                <Row label="Family" value={model.family ?? '—'} />
                <Row
                  label="Flags"
                  value={
                    <span className="flex gap-1">
                      <Badge variant={model.isLocal ? 'default' : 'secondary'}>
                        {model.isLocal ? 'local' : 'cloud'}
                      </Badge>
                      {model.isRouterOnly ? <Badge variant="outline">router-only</Badge> : null}
                      <Badge variant={model.lifecycle === 'ACTIVE' ? 'default' : 'secondary'}>
                        {model.lifecycle}
                      </Badge>
                    </span>
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Economics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row
                  label="Input cost"
                  value={model.inputCostPer1M !== null ? `$${model.inputCostPer1M}/1M` : '—'}
                />
                <Row
                  label="Output cost"
                  value={model.outputCostPer1M !== null ? `$${model.outputCostPer1M}/1M` : '—'}
                />
                <Row label="Cost confidence" value={model.costConfidence} />
                <Row label="Cost class" value={model.costClass ?? '—'} />
                <Row label="Quality tier" value={model.qualityTier} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row
                  label="Context window"
                  value={
                    model.contextWindowTokens !== null
                      ? `${model.contextWindowTokens.toLocaleString()} tokens`
                      : '—'
                  }
                />
                <Row label="Modalities in" value={model.modalitiesIn.join(', ') || '—'} />
                <Row label="Modalities out" value={model.modalitiesOut.join(', ') || '—'} />
                <Row label="Domain tags" value={model.domainTags.join(', ') || 'GENERAL'} />
                <Row label="Privacy support" value={model.privacySupport} />
                <Row
                  label="Latency p95"
                  value={
                    model.latencyP95Ms !== null
                      ? `${model.latencyP95Ms}ms (${model.latencyClass ?? '—'})`
                      : '—'
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin overrides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <OverridesPanel isLoading={overrides.isLoading} data={overrides.data} />
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}

function DrawerBody({
  isLoading,
  isError,
  hasModel,
}: {
  isLoading: boolean;
  isError: boolean;
  hasModel: boolean;
}): ReactElement | null {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (isError || !hasModel) {
    return <p className="text-sm text-destructive">Failed to load model detail.</p>;
  }
  return null;
}

function OverridesPanel({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: RouterAdminOverride[] | undefined;
}): ReactElement {
  if (isLoading) {
    return <p className="text-muted-foreground">Loading overrides…</p>;
  }
  if (data === undefined || data.length === 0) {
    return (
      <p className="text-muted-foreground">
        No active overrides. Edits to managed fields will create one and survive upstream syncs.
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {data.map((o) => (
        <li
          key={o.id}
          className="flex items-center justify-between rounded border border-border px-2 py-1"
        >
          <span className="font-mono text-xs">{o.fieldName}</span>
          <span className="text-xs text-muted-foreground">set by {o.setBy}</span>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, value }: RouterModelDetailRowProps): ReactElement {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
