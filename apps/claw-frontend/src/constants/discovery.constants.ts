import { CandidateStatusFilter } from '@/enums';
import type { StatusFilterOption } from '@/types';

export const DISCOVERY_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: CandidateStatusFilter.ALL, label: 'discovery.filter.all' },
  { value: CandidateStatusFilter.PENDING, label: 'discovery.filter.pending' },
  { value: CandidateStatusFilter.APPROVED, label: 'discovery.filter.approved' },
  { value: CandidateStatusFilter.REJECTED, label: 'discovery.filter.rejected' },
  { value: CandidateStatusFilter.IMPORTED, label: 'discovery.filter.imported' },
  { value: CandidateStatusFilter.DUPLICATE, label: 'discovery.filter.duplicate' },
];
