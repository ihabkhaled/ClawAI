import { describe, expect, it } from 'vitest';

import { ThreadPublicationChangeRequestStatus as Status } from '@/enums/thread-publication-change-request-status.enum';
import type { ThreadPublicationChangeRequest } from '@/types/thread-publication.types';
import { orderChangeRequests } from '@/utilities/thread-change-request-order.utility';

function request(id: string, status: Status): ThreadPublicationChangeRequest {
  return {
    id,
    suggestion: id,
    status,
    ownerResponse: null,
    acceptedRevisionId: null,
    createdAt: '2026-10-15T00:00:00.000Z',
    requester: null,
  };
}

describe('orderChangeRequests', () => {
  it('puts waiting suggestions first and keeps the newest-first order inside each group', () => {
    const ordered = orderChangeRequests([
      request('declined-new', Status.Rejected),
      request('pending-new', Status.Pending),
      request('applied', Status.Applied),
      request('pending-old', Status.Pending),
    ]);
    expect(ordered.map((item) => item.id)).toEqual([
      'pending-new',
      'pending-old',
      'declined-new',
      'applied',
    ]);
  });

  it('does not change the list it was given', () => {
    const input = [request('a', Status.Rejected), request('b', Status.Pending)];
    orderChangeRequests(input);
    expect(input.map((item) => item.id)).toEqual(['a', 'b']);
  });
});
