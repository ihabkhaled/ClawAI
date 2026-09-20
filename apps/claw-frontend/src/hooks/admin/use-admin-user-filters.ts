import { useState } from 'react';

import { usePagination } from '@/hooks/use-pagination';
import type { UseAdminUserFiltersReturn } from '@/types';

export function useAdminUserFilters(): UseAdminUserFiltersReturn {
  // Page and page-size state is the shared control's, not this page's: every
  // paged list here gets the same clamping and the same reset-on-resize.
  const { page, pageSize, goToPage, setPageSize, reset } = usePagination();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  const updateSearch = (value: string) => {
    setSearch(value);
    reset();
  };
  const updateRole = (value: string) => {
    setRoleFilter(value);
    reset();
  };
  const updateStatus = (value: string) => {
    setStatusFilter(value);
    reset();
  };
  const updatePlan = (value: string) => {
    setPlanFilter(value);
    reset();
  };
  const updateVerification = (value: string) => {
    setVerificationFilter(value);
    reset();
  };

  return {
    page,
    pageSize,
    setPage: goToPage,
    setPageSize,
    search,
    setSearch: updateSearch,
    roleFilter,
    setRoleFilter: updateRole,
    statusFilter,
    setStatusFilter: updateStatus,
    planFilter,
    setPlanFilter: updatePlan,
    verificationFilter,
    setVerificationFilter: updateVerification,
  };
}
