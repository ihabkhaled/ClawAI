import { Test } from '@nestjs/testing';
import { PROMETHEUS_TEXT_CONTENT_TYPE } from '@claw/shared-utilities';

import { IS_PUBLIC_KEY } from '../../../app/decorators/public.decorator';
import { ImageGenerationMetricOutcome } from '../../../common/enums';
import { MetricsController } from '../controllers/metrics.controller';
import { MetricsModule } from '../metrics.module';
import { ImageMediaMetricsService } from '../services/image-media-metrics.service';

describe('image-service /metrics', () => {
  it('is public (Prometheus has no JWT) and serves the Prometheus text type', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, MetricsController)).toBe(true);
    const headers: unknown = Reflect.getMetadata('__headers__', MetricsController.prototype.scrape);
    expect(headers).toEqual([{ name: 'Content-Type', value: PROMETHEUS_TEXT_CONTENT_TYPE }]);
  });

  it('counts every provider and outcome, and folds an unknown provider into other', async () => {
    const module = await Test.createTestingModule({ imports: [MetricsModule] }).compile();
    const metrics = module.get(ImageMediaMetricsService);
    metrics.recordGeneration('IMAGE_GROK', ImageGenerationMetricOutcome.COMPLETED, 12_000);
    metrics.recordGeneration('IMAGE_LOCAL_COMFYUI', ImageGenerationMetricOutcome.CANCELLED, 500);
    metrics.recordGeneration('gpt-image-1 by user 42', ImageGenerationMetricOutcome.FAILED, 1_000);

    const text = module.get(MetricsController).scrape();
    expect(text).toContain(
      'claw_image_generations_total{provider="image_grok",outcome="completed"} 1',
    );
    expect(text).toContain(
      'claw_image_generations_total{provider="image_local_comfyui",outcome="cancelled"} 1',
    );
    expect(text).toContain('claw_image_generations_total{provider="other",outcome="failed"} 1');
    expect(text).toContain(
      'claw_image_generation_duration_seconds_bucket{provider="image_grok",outcome="completed",le="15"} 1',
    );
    expect(text).not.toContain('user 42');
  });
});
