'use client';

import { Route } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoutingMode } from '@/enums';

export default function RoutingPage(): React.ReactElement {
  return (
    <div>
      <PageHeader
        title="Routing"
        description="Configure how requests are routed across your AI models"
        actions={
          <Button>
            <Route className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Routing Mode</CardTitle>
            <CardDescription>
              Choose how the local router distributes requests across models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Mode</label>
              <Select defaultValue={RoutingMode.AUTO}>
                <SelectTrigger>
                  <SelectValue placeholder="Select routing mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RoutingMode.AUTO}>Auto</SelectItem>
                  <SelectItem value={RoutingMode.MANUAL_MODEL}>Manual Model</SelectItem>
                  <SelectItem value={RoutingMode.LOCAL_ONLY}>Local Only</SelectItem>
                  <SelectItem value={RoutingMode.PRIVACY_FIRST}>Privacy First</SelectItem>
                  <SelectItem value={RoutingMode.LOW_LATENCY}>Low Latency</SelectItem>
                  <SelectItem value={RoutingMode.HIGH_REASONING}>High Reasoning</SelectItem>
                  <SelectItem value={RoutingMode.COST_SAVER}>Cost Saver</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fallback Settings</CardTitle>
            <CardDescription>Configure retry and timeout behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Retries</label>
              <Input type="number" defaultValue={3} min={0} max={10} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Timeout (ms)</label>
              <Input type="number" defaultValue={30000} min={1000} step={1000} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
