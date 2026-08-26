'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChainTemplateCardProps } from '@/types';

export function ChainTemplateCard({
  template,
  onInstantiate,
  t,
}: ChainTemplateCardProps): React.ReactElement {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">{template.name}</CardTitle>
        <p className="text-muted-foreground mt-1 text-xs">{template.description}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-1">
          {template.requiredProviders.map((provider) => (
            <Badge key={provider} variant="outline" className="text-xs">
              {provider}
            </Badge>
          ))}
        </div>
        <Badge variant="secondary" className="w-fit text-xs">
          {template.category}
        </Badge>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => onInstantiate(template)}>
          {t('workspaceChains.templates.useTemplate')}
        </Button>
      </CardFooter>
    </Card>
  );
}
