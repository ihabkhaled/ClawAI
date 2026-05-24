// SCAFFOLD: stream R.8 (09-r8-advanced-intelligence)
// Umbrella module for 9 independent sub-features. NOT yet registered.

import { Module } from '@nestjs/common';

import { ConsensusModeManager } from './managers/consensus-mode.manager';
import { CostQualitySliderManager } from './managers/cost-quality-slider.manager';
import { EmbeddingRouterManager } from './managers/embedding-router.manager';
import { FineTunePreferenceManager } from './managers/fine-tune-preference.manager';
import { LatencyCircuitBreakerManager } from './managers/latency-circuit-breaker.manager';
import { MidStreamSwitcherManager } from './managers/mid-stream-switcher.manager';
import { MultiIntentSplitterManager } from './managers/multi-intent-splitter.manager';
import { PromptLengthGuardManager } from './managers/prompt-length-guard.manager';
import { RegionRouterManager } from './managers/region-router.manager';

@Module({
  providers: [
    PromptLengthGuardManager,
    LatencyCircuitBreakerManager,
    MidStreamSwitcherManager,
    FineTunePreferenceManager,
    RegionRouterManager,
    MultiIntentSplitterManager,
    EmbeddingRouterManager,
    ConsensusModeManager,
    CostQualitySliderManager,
  ],
  exports: [
    PromptLengthGuardManager,
    LatencyCircuitBreakerManager,
    MidStreamSwitcherManager,
    FineTunePreferenceManager,
    RegionRouterManager,
    MultiIntentSplitterManager,
    EmbeddingRouterManager,
    ConsensusModeManager,
    CostQualitySliderManager,
  ],
})
export class IntelligenceModule {}
