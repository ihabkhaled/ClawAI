export type ThreadRevisionRequestInput = {
  markdown: string;
  citations: Array<{ evidenceId: string; url: string }>;
  spendCapUsd: number;
  idempotencyKey: string;
  correlationId: string;
};

export type ThreadRevisionRequest = {
  markdown: string;
  citations: Array<{ evidenceId: string; url: string }>;
  capMicroUsd: number;
  idempotencyKey: string;
  correlationId: string;
};

export function createThreadRevisionRequest(
  input: ThreadRevisionRequestInput,
): ThreadRevisionRequest {
  const markdown = input.markdown.trim();
  if (!markdown || markdown.length > 100_000) {
    throw new Error('Revision content is required');
  }
  if (
    input.citations.length === 0 ||
    input.citations.length > 100 ||
    input.citations.some(({ evidenceId, url }) => !evidenceId || !URL.canParse(url))
  ) {
    throw new Error('At least one citation is required');
  }
  const capMicroUsd = Math.round(input.spendCapUsd * 1_000_000);
  if (!Number.isSafeInteger(capMicroUsd) || capMicroUsd <= 0) {
    throw new Error('A positive, safe spend cap is required');
  }
  return {
    markdown,
    citations: input.citations,
    capMicroUsd,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
  };
}
