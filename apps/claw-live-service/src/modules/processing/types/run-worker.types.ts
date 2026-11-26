import type { RunLifecycleManager } from '../managers/run-lifecycle.manager';
import type { ReportManager } from '../managers/report.manager';
import type { SummaryManager } from '../managers/summary.manager';
import type { TranscriptManager } from '../managers/transcript.manager';
import type { TranslationManager } from '../managers/translation.manager';
import type { VisionManager } from '../managers/vision.manager';
import type { FencedRunWriter } from '../services/fenced-run-writer.service';

/** The injectables a RunWorker uses (handed over by RunWorkerFactory). */
export interface RunWorkerDeps {
  writer: FencedRunWriter;
  lifecycle: RunLifecycleManager;
  transcripts: TranscriptManager;
  summaries: SummaryManager;
  reports: ReportManager;
  translations: TranslationManager;
  vision: VisionManager;
}
