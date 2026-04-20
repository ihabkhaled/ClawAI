'use client';

import { CheckCircle2, ExternalLink, Lock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProviderCardProps } from '@/types';

export function ProviderCard({
  provider,
  implementedAdapters,
  t,
}: ProviderCardProps): React.ReactElement {
  const isImplemented = implementedAdapters.has(provider.provider);
  const capabilityKeys = Object.keys(provider.capabilities).filter(
    (k) => provider.capabilities[k] === true,
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{provider.displayName}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{provider.description}</p>
        </div>
        {isImplemented ? (
          <Badge variant="default" className="shrink-0">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t('workspaceProviders.catalog.available')}
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0">
            {t('workspaceProviders.catalog.comingSoon')}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap gap-1">
          {provider.authModes.map((mode) => (
            <Badge key={mode} variant="outline" className="text-xs">
              {mode}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {capabilityKeys.slice(0, 4).map((cap) => (
            <Badge key={cap} variant="outline" className="text-xs capitalize">
              {cap}
            </Badge>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {provider.supportedObjects.length} {t('workspaceProviders.catalog.objectTypes')}
          </span>
          {provider.docsUrl !== null ? (
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              {t('workspaceProviders.catalog.docs')}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
