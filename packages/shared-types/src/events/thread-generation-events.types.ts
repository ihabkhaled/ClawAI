export interface ThreadGenerationRequestedPayload {
  jobId: string;
  correlationId: string;
  requestedAt: string;
}

export interface ThreadGenerationCompletedPayload {
  jobId: string;
  correlationId: string;
}

export interface ThreadGenerationFailedPayload {
  jobId: string;
  correlationId: string;
  errorCode: string;
}
