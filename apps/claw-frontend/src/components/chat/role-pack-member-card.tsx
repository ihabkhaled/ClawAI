'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { RolePackMemberCardProps } from '@/types';

export function RolePackMemberCard({ member, t }: RolePackMemberCardProps): React.ReactElement {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{member.role}</Badge>
          <span className="text-xs text-muted-foreground">
            {t('rolePack.model')}: {member.model}
          </span>
          <span className="ms-auto text-xs text-muted-foreground">
            {t('rolePack.latency')}: {String(member.latencyMs)}ms
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="whitespace-pre-wrap text-sm text-foreground">{member.output}</p>
      </CardContent>
    </Card>
  );
}
