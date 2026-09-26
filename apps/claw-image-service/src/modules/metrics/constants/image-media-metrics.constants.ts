import { type CounterDefinition, type HistogramDefinition } from '@claw/shared-utilities';

import { IMAGE_LOCAL_PROVIDERS, IMAGE_PROVIDER_CONNECTORS } from '../../../common/constants';
import { ImageGenerationMetricOutcome } from '../../../common/enums';

/** Every image provider image-service can run: the cloud ones and the local ones. */
const IMAGE_METRIC_PROVIDERS: readonly string[] = [
  ...IMAGE_PROVIDER_CONNECTORS.keys(),
  ...IMAGE_LOCAL_PROVIDERS,
];

/**
 * image-service's media metrics (pack §67, ADR-113 addendum "media metrics").
 * Labels: the image provider (a fixed list) and the outcome — never a
 * generation id, a user id, a prompt or a model name (rules/19).
 */
export const IMAGE_GENERATION_METRIC: CounterDefinition = {
  name: 'claw_image_generations_total',
  help: 'Image generation attempts that ended, by image provider and outcome.',
  labels: {
    provider: IMAGE_METRIC_PROVIDERS,
    outcome: Object.values(ImageGenerationMetricOutcome),
  },
};

export const IMAGE_GENERATION_DURATION_METRIC: HistogramDefinition = {
  name: 'claw_image_generation_duration_seconds',
  help: 'Seconds from an attempt starting to it ending, by image provider and outcome.',
  labels: {
    provider: IMAGE_METRIC_PROVIDERS,
    outcome: Object.values(ImageGenerationMetricOutcome),
  },
  buckets: [1, 2.5, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300],
};

export const MS_PER_SECOND = 1_000;
