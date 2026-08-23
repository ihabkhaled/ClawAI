'use client';

import { Download, Loader2, Server } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HardwarePacksGridProps } from '@/types';

export function HardwarePacksGrid({
  packs,
  isLoading,
  isInstallPending,
  onInstall,
  t,
}: HardwarePacksGridProps): React.ReactElement {
  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
  }
  if (packs.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('discovery.packs.empty')}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {packs.map((pack) => (
        <Card key={pack.profile}>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded">
              <Server className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm">{pack.label}</CardTitle>
              <p className="text-muted-foreground mt-0.5 text-xs">{pack.description}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1">
              {pack.recommendedModels.length === 0 ? (
                <Badge variant="outline" className="text-xs">
                  {t('discovery.packs.noModelsYet')}
                </Badge>
              ) : (
                pack.recommendedModels.slice(0, 5).map((m) => (
                  <Badge key={m} variant="outline" className="text-xs">
                    {m}
                  </Badge>
                ))
              )}
              {pack.recommendedModels.length > 5 ? (
                <Badge variant="outline" className="text-xs">
                  +{pack.recommendedModels.length - 5}
                </Badge>
              ) : null}
            </div>
            <Button
              variant="default"
              size="sm"
              className="w-full"
              disabled={pack.recommendedModels.length === 0 || isInstallPending}
              onClick={() => onInstall(pack.profile)}
            >
              {isInstallPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t('discovery.packs.install')}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
