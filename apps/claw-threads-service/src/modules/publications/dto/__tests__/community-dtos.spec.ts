import { createPublicationChangeRequestSchema } from '../create-publication-change-request.dto';
import { createPublicationCommentSchema } from '../create-publication-comment.dto';
import { createPublicationReportSchema } from '../create-publication-report.dto';
import { moderatePublicationReportSchema } from '../moderate-publication-report.dto';
import { resolvePublicationChangeRequestSchema } from '../resolve-publication-change-request.dto';
import { setPublicationReactionSchema } from '../set-publication-reaction.dto';

describe('publication community DTOs', () => {
  it('trims bounded comment and change request text', () => {
    expect(createPublicationCommentSchema.parse({ content: '  useful note  ' }).content).toBe(
      'useful note',
    );
    expect(
      createPublicationChangeRequestSchema.parse({ suggestion: '  add one source  ' }).suggestion,
    ).toBe('add one source');
    expect(createPublicationCommentSchema.safeParse({ content: '  ' }).success).toBe(false);
    expect(createPublicationCommentSchema.safeParse({ content: 'x'.repeat(5001) }).success).toBe(
      false,
    );
  });

  it('accepts only known reaction and report values', () => {
    expect(setPublicationReactionSchema.safeParse({ value: 'LIKE' }).success).toBe(true);
    expect(setPublicationReactionSchema.safeParse({ value: 'CLAP' }).success).toBe(false);
    expect(createPublicationReportSchema.safeParse({ reason: 'PRIVATE_INFORMATION' }).success).toBe(
      true,
    );
    expect(
      createPublicationReportSchema.safeParse({ reason: 'OTHER', details: 'x'.repeat(1001) })
        .success,
    ).toBe(false);
  });

  it('limits owners and moderators to explicit terminal decisions', () => {
    expect(resolvePublicationChangeRequestSchema.safeParse({ status: 'ACCEPTED' }).success).toBe(
      false,
    );
    expect(
      resolvePublicationChangeRequestSchema.safeParse({
        status: 'ACCEPTED',
        revision: {
          markdown: 'Updated article',
          citations: [{ evidenceId: 'evidence-1', url: 'https://example.com/source' }],
          capMicroUsd: 1000,
          idempotencyKey: 'edit-1',
          correlationId: 'request-1',
        },
      }).success,
    ).toBe(true);
    expect(resolvePublicationChangeRequestSchema.safeParse({ status: 'PENDING' }).success).toBe(
      false,
    );
    expect(moderatePublicationReportSchema.safeParse({ status: 'RESOLVED' }).success).toBe(true);
    expect(moderatePublicationReportSchema.safeParse({ status: 'OPEN' }).success).toBe(false);
  });
});
