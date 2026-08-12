import { CompareCriticControls } from '@/components/chat/compare-critic-controls';
import { CompareJudgeControls } from '@/components/chat/compare-judge-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ThreadQualityPanelProps } from '@/types';

export function ThreadQualityPanel(props: ThreadQualityPanelProps): React.ReactElement {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{props.t('chat.judgeReferee')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.allowJudgeMode ? <CompareJudgeControls {...props} /> : null}
        {props.allowJudgeMode && props.allowCriticReview && props.judgeEnabled ? (
          <CompareCriticControls
            criticEnabled={props.criticEnabled}
            onCriticEnabledChange={props.onCriticEnabledChange}
            criticModel={props.criticModel}
            onCriticModelChange={props.onCriticModelChange}
            criticModelOptions={props.judgeModelOptions}
            criticModelOptionsLoading={props.judgeModelOptionsLoading}
            criticEnablementDisabled={props.criticEnablementDisabled}
            t={props.t}
          />
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="quality-threshold">
            {props.t('chat.qualityThreshold')}: {props.qualityThreshold.toFixed(1)}
          </label>
          <p className="text-muted-foreground text-xs">
            {props.t('chat.qualityThresholdDescription')}
          </p>
          <input
            id="quality-threshold"
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={props.qualityThreshold}
            onChange={(event) => props.onQualityThresholdChange(Number(event.target.value))}
            className="accent-primary w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="max-reroute-attempts">
            {props.t('chat.maxReRouteAttempts')}: {props.maxReRouteAttempts}
          </label>
          <p className="text-muted-foreground text-xs">
            {props.t('chat.maxReRouteAttemptsDescription')}
          </p>
          <Input
            id="max-reroute-attempts"
            type="number"
            min={0}
            max={5}
            value={String(props.maxReRouteAttempts)}
            onChange={(event) => props.onMaxReRouteAttemptsChange(Number(event.target.value))}
          />
        </div>
        <Button onClick={props.onSave} disabled={props.isPending || !props.canSave} size="sm">
          {props.isPending ? props.t('common.loading') : props.t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
