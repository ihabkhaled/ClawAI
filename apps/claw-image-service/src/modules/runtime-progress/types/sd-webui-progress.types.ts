import type { ClawRuntimeProgressEvent } from '@claw/shared-types';

export type SdWebuiProgressResponse = {
  progress?: number;
  eta_relative?: number;
  state?: {
    job?: string;
    sampling_step?: number;
    sampling_steps?: number;
    interrupted?: boolean;
  };
  current_image?: string | null;
};

export type SdWebuiProgressStartOptions = {
  sdUrl: string;
  runId: string;
  totalSteps: number;
  intervalMs?: number;
  preview?: boolean;
  messageId?: string;
  modelId?: string;
};

export type SdWebuiProgressSession = {
  events: AsyncGenerator<ClawRuntimeProgressEvent, void, void>;
  nextSequence: () => number;
  stop: () => void;
};

export type SdWebuiProgressAdapterContract = {
  start(opts: SdWebuiProgressStartOptions): SdWebuiProgressSession;
  cancel(sdUrl: string): Promise<void>;
};
