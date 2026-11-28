import { useModelScaleFormatter } from '@/hooks/chat/use-model-scale-formatter';
import type { ModelScaleLineProps } from '@/types/model-scale.types';

/** "1M context · 750B params" as one line of a model's detail; nothing when its size is unknown. */
export function ModelScaleLine({
  provider,
  modelKey,
  contextTokens,
}: ModelScaleLineProps): React.ReactElement | null {
  const { scaleText } = useModelScaleFormatter();
  const text = scaleText(provider, modelKey, contextTokens);
  if (text === undefined) {
    return null;
  }
  return (
    <p title={text.title} data-testid="model-scale">
      {text.label}
    </p>
  );
}
