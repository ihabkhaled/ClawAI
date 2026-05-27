'use client';

import { Play, RotateCcw } from 'lucide-react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { RoutingPlaygroundSemanticResult } from '@/components/routing/routing-playground-semantic-result';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  ROUTING_MODE_LABELS,
  ROUTING_MODE_OPTIONS,
  ROUTING_PLAYGROUND_MAX_MESSAGE_CHARS,
  ROUTING_PLAYGROUND_TAB_SEMANTIC,
} from '@/constants';
import type { RoutingMode } from '@/enums';
import { useRoutingPlaygroundPage } from '@/hooks/routing/use-routing-playground-page';
import { useTranslation } from '@/lib/i18n';

export default function RoutingPlaygroundPage(): React.ReactElement {
  const { t } = useTranslation();
  const {
    activeTab,
    setActiveTab,
    message,
    setMessage,
    routingMode,
    setRoutingMode,
    handleRunSemantic,
    resetForm,
    semanticResult,
    isSemanticPending,
    isSemanticError,
    semanticError,
  } = useRoutingPlaygroundPage();

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={t('routingPlayground.title')}
        description={t('routingPlayground.description')}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value={ROUTING_PLAYGROUND_TAB_SEMANTIC}>
            {t('routingPlayground.tab.semantic')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={ROUTING_PLAYGROUND_TAB_SEMANTIC} className="mt-4 space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <label className="block text-sm font-medium" htmlFor="playground-message">
                {t('routingPlayground.form.messageLabel')}
              </label>
              <Textarea
                id="playground-message"
                value={message}
                maxLength={ROUTING_PLAYGROUND_MAX_MESSAGE_CHARS}
                placeholder={t('routingPlayground.form.messagePlaceholder')}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor="playground-mode">
                    {t('routingPlayground.form.routingModeLabel')}
                  </label>
                  <Select
                    value={routingMode}
                    onValueChange={(value) => setRoutingMode(value as RoutingMode)}
                  >
                    <SelectTrigger id="playground-mode" className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTING_MODE_OPTIONS.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {ROUTING_MODE_LABELS[mode] ?? mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    disabled={isSemanticPending}
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    {t('routingPlayground.form.reset')}
                  </Button>
                  <Button
                    onClick={handleRunSemantic}
                    disabled={isSemanticPending || message.trim().length === 0}
                  >
                    <Play className="mr-1.5 h-4 w-4" />
                    {t('routingPlayground.form.runSemantic')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isSemanticPending ? (
            <LoadingSpinner label={t('routingPlayground.form.running')} />
          ) : null}

          {isSemanticError ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-destructive">
                  {t('routingPlayground.form.error')}
                  {semanticError !== null ? `: ${semanticError}` : ''}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {!isSemanticPending && !isSemanticError && semanticResult !== undefined ? (
            <RoutingPlaygroundSemanticResult result={semanticResult} />
          ) : null}

          {!isSemanticPending && !isSemanticError && semanticResult === undefined ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  {t('routingPlayground.form.emptyHint')}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
