import type { ThreadPublicationStatus } from '@/enums/thread-publication-status.enum';

export type OwnedThreadPublication = {
  id: string;
  status: ThreadPublicationStatus;
  title: string | null;
  updatedAt: string;
};

export type ThreadGenerationState = {
  publicationId: string;
  publicationStatus: string;
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
