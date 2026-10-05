import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';

export type GenerationEnqueueInput = Omit<StartThreadGenerationDto, 'capMicroUsd'> & {
  spendCapMicroUsd: string;
  publicIntentVersion: string;
};

export type PrivateGenerationState = {
  jobId: string;
  status: string;
  stage: string;
  round: number;
  safeErrorCode: string | null;
  draft: {
    markdown: string;
    citations: Array<{ evidenceId: string; url: string }>;
    judgeScore: number;
    criticScore: number;
  } | null;
};
