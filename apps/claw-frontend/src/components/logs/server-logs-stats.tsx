import { Activity, AlertTriangle, Clock, Server } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SERVER_LOG_STATS_TOP_SERVICES_LIMIT } from '@/constants';
import type { ServerLogsStatsProps } from '@/types';
import { formatLogLatency, getLevelBadgeClass } from '@/utilities/log-stats.utility';

export function ServerLogsStats({ stats }: ServerLogsStatsProps): React.ReactElement {
  const topServices = [...stats.byService]
    .sort((a, b) => b.count - a.count)
    .slice(0, SERVER_LOG_STATS_TOP_SERVICES_LIMIT);

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {stats.errorCount.toLocaleString()}
            </p>
            {stats.total > 0 ? (
              <p className="text-xs text-muted-foreground">
                {((stats.errorCount / stats.total) * 100).toFixed(1)}% of total
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatLogLatency(stats.avgLatencyMs)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.byLevel.map((item) => (
                <Badge key={item._id} variant="outline" className={getLevelBadgeClass(item._id)}>
                  {item._id.toUpperCase()} {item.count.toLocaleString()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Top Services</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topServices.map((item) => (
                <div key={item._id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{item._id}</span>
                  <span className="ml-2 font-medium">{item.count.toLocaleString()}</span>
                </div>
              ))}
              {topServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service data available</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
