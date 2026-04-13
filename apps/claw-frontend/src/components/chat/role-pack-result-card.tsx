'use client';

import { ExternalLink } from 'lucide-react';

import { RolePackMemberCard } from '@/components/chat/role-pack-member-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RolePackResultCardProps } from '@/types';

export function RolePackResultCard({
  result,
  onViewInThread,
  t,
}: RolePackResultCardProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t('rolePack.title')}</CardTitle>
              <Badge variant="outline">{result.metadata.pack}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={onViewInThread}>
              <ExternalLink className="me-2 h-3 w-3" />
              {t('rolePack.viewInThread')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-foreground">{result.content}</p>
        </CardContent>
      </Card>

      {result.metadata.members.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t('rolePack.teamBreakdown')}
          </h3>
          {result.metadata.members.map((member, i) => (
            <RolePackMemberCard key={`${member.role}-${String(i)}`} member={member} t={t} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
